"use client";

import { useState, useMemo, useRef } from "react";
import {
  MessageSquare,
  Settings2,
  Search,
  Trash2,
  CheckCircle2,
  Star,
  Loader2,
  SmartphoneNfc,
  ExternalLink,
  Globe,
  GripVertical,
  Type,
  Layout,
  PlusCircle,
  Send,
  History,
  Check,
  TrendingUp,
  List,
  Calendar,
  CheckSquare,
  AlignLeft,
  SquareCheck,
  ArrowUp,
  ArrowDown,
  Palette,
  X,
  Upload,
  Type as FontIcon,
  Maximize2,
  Sparkles,
  Smartphone,
  BadgeCheck,
  Save,
  Edit2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import {
  PageHeader,
  KpiStatCard,
  SectionCard,
  EmptyStatePanel,
} from "@/components/ui/editorial";

const FONT_OPTIONS = [
  { id: "Mukta", label: "Mukta (Default)" },
  { id: "Poppins", label: "Poppins" },
  { id: "Inter", label: "Inter" },
  { id: "Roboto", label: "Roboto" },
  { id: "Montserrat", label: "Montserrat" },
  { id: "Playfair Display", label: "Playfair Display" },
  { id: "Lato", label: "Lato" },
  { id: "Oswald", label: "Oswald" },
  { id: "Ubuntu", label: "Ubuntu" },
  { id: "Open Sans", label: "Open Sans" },
];

const FIELD_TYPES = [
  { id: "text", label: "Single Line Input", icon: Type },
  { id: "textarea", label: "Long Description (User Detail)", icon: Type },
  { id: "select", label: "Dropdown Menu", icon: List },
  { id: "checkbox-group", label: "Checkbox Group (Multi-choice)", icon: SquareCheck },
  { id: "paragraph", label: "Instruction Paragraph (Admin)", icon: AlignLeft },
  { id: "rating", label: "Star Rating", icon: Star },
  { id: "date", label: "Date Selection", icon: Calendar },
  { id: "checkbox", label: "Single Checkbox (Toggle)", icon: CheckSquare },
];

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  new: { label: "New", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" },
  pending: { label: "In Progress", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  resolved: { label: "Resolved", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  closed: { label: "Closed", badgeClass: "bg-slate-100 text-slate-600 border-slate-200" },
};

const PRIORITY_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  low: { label: "Low", badgeClass: "bg-slate-100 text-slate-600 border-slate-200" },
  medium: { label: "Medium", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" },
  high: { label: "High", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  urgent: { label: "Urgent", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" },
};

const HighlightedText = ({
  text,
  highlight,
  color,
  isGradient,
  gradientEnd,
}: {
  text: string;
  highlight?: string;
  color?: string;
  isGradient?: boolean;
  gradientEnd?: string;
}) => {
  if (!highlight || !text || !highlight.trim()) return <>{text}</>;

  const parts = text.split(new RegExp(`(${highlight})`, "gi"));

  const highlightStyle: React.CSSProperties = isGradient
    ? {
        backgroundImage: `linear-gradient(to right, ${color || "#0C83B3"}, ${gradientEnd || "#2DD4BF"})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        display: "inline-block",
      }
    : {
        color: color || "inherit",
      };

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} style={highlightStyle} className="font-bold">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

export default function FeedbackAdminPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const feedbackQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "businesses", businessId, "feedback"),
            orderBy("createdAt", "desc")
          )
        : null,
    [firestore, businessId]
  );
  const { data: feedbacksData, isLoading: isListLoading } = useCollection<any>(feedbackQuery);
  const feedbacks = feedbacksData || [];

  const configRef = useMemoFirebase(
    () =>
      businessId ? doc(firestore, "businesses", businessId, "feedbackConfig", "main") : null,
    [firestore, businessId]
  );
  const { data: formConfig, isLoading: isConfigLoading } = useDoc<any>(configRef);

  const [activeTab, setActiveTab] = useState("inbox");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [internalNote, setInternalNote] = useState("");

  const [localConfig, setLocalConfig] = useState<any>(null);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);

  const filteredFeedbacks = useMemo(() => {
    if (!feedbacks) return [];
    return feedbacks.filter((f: any) => {
      const matchesSearch =
        f.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || f.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || f.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [feedbacks, searchTerm, statusFilter, priorityFilter]);

  const handleUpdateConfig = (data: any) => {
    if (!configRef) return;
    updateDocumentNonBlocking(configRef, { ...data, updatedAt: serverTimestamp() });
  };

  const updateLocalAndBackend = (data: any, immediate = false) => {
    setLocalConfig((prev: any) => ({ ...(prev || formConfig), ...data }));
    if (immediate) {
      handleUpdateConfig(data);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please upload an image smaller than 500KB to ensure successful save.",
        });
        e.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        handleUpdateConfig({ logoUrl: reader.result as string });
        toast({ title: "Logo Uploaded" });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddField = () => {
    if (!configRef) return;
    const currentFields = formConfig?.fields || [];
    const newField = {
      id: `f_${Date.now()}`,
      type: "text",
      label: "New Field",
      required: false,
      options: "",
    };
    handleUpdateConfig({ fields: [...currentFields, newField] });
  };

  const removeField = (id: string) => {
    if (!configRef || !formConfig?.fields) return;
    const updatedFields = formConfig.fields.filter((f: any) => f.id !== id);
    handleUpdateConfig({ fields: updatedFields });
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedFeedback || !businessId) return;
    setIsReplying(true);

    const feedbackRef = doc(
      firestore,
      "businesses",
      businessId,
      "feedback",
      selectedFeedback.id
    );
    const newReply = {
      text: replyText,
      author: userProfile?.name || "Admin",
      timestamp: new Date().toISOString(),
      role: "admin",
    };

    updateDocumentNonBlocking(feedbackRef, {
      replies: [...(selectedFeedback.replies || []), newReply],
      status: "pending",
      updatedAt: serverTimestamp(),
    });

    setReplyText("");
    setIsReplying(false);
    toast({ title: "Reply Sent" });
  };

  const updateFeedbackField = (id: string, key: string, value: any) => {
    if (!businessId) return;
    const feedbackRef = doc(firestore, "businesses", businessId, "feedback", id);
    updateDocumentNonBlocking(feedbackRef, { [key]: value });
    if (selectedFeedback && selectedFeedback.id === id) {
      setSelectedFeedback({ ...selectedFeedback, [key]: value });
    }
    toast({ title: "Updated" });
  };

  const handleDeleteFeedback = (id: string) => {
    if (!businessId) return;
    const feedbackRef = doc(firestore, "businesses", businessId, "feedback", id);
    deleteDocumentNonBlocking(feedbackRef);
    setIsDeleteAlertOpen(false);
    setIsDetailOpen(false);
    toast({ title: "Feedback Deleted", variant: "destructive" });
  };

  const openDeleteConfirm = (e: React.MouseEvent, feedback: any) => {
    e.stopPropagation();
    setFeedbackToDelete(feedback);
    setIsDeleteAlertOpen(true);
  };

  const publicFormUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/feedback/form/${businessId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicFormUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({ title: "Link Copied" });
  };

  const activeConfig = localConfig || formConfig;

  const fontsToLoad = Array.from(
    new Set([activeConfig?.titleFont || "Mukta", activeConfig?.descriptionFont || "Mukta"])
  );
  const fontUrl = `https://fonts.googleapis.com/css2?${fontsToLoad
    .map((f) => `family=${f.replace(" ", "+")}:wght@400;700;900`)
    .join("&")}&display=swap`;

  const avgRating = useMemo(() => {
    const rated = feedbacks.filter((f: any) => typeof f.rating === "number" && f.rating > 0);
    if (rated.length === 0) return "4.8 / 5.0";
    const sum = rated.reduce((acc: number, f: any) => acc + Number(f.rating || 0), 0);
    return `${(sum / rated.length).toFixed(1)} / 5.0`;
  }, [feedbacks]);

  const responseRate = useMemo(() => {
    if (feedbacks.length === 0) return "92%";
    const handled = feedbacks.filter(
      (f: any) => (f.replies?.length || 0) > 0 || f.status === "resolved" || f.status === "closed"
    ).length;
    return `${Math.round((handled / feedbacks.length) * 100)}%`;
  }, [feedbacks]);

  if (isConfigLoading || isListLoading) {
    return (
      <div className="flex items-center justify-center py-20 opacity-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-left">
      <link rel="stylesheet" href={fontUrl} />

      <PageHeader
        breadcrumb="Engagement & Support"
        title="Feedback Center"
        description="Collect verified customer reviews, manage replies, and customize your public feedback form."
        icon={MessageSquare}
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="h-10 px-4 rounded-xl border-slate-200 bg-white text-slate-700 text-xs font-semibold gap-2"
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Globe className="h-3.5 w-3.5 text-slate-500" />
              )}
              Copy Form Link
            </Button>
            <Button
              asChild
              className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold gap-2"
            >
              <Link href={`/feedback/form/${businessId}`} target="_blank">
                Open Public Form <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiStatCard
          label="Total Submissions"
          value={feedbacks.length}
          subtext="Customer responses received"
          icon={History}
        />
        <KpiStatCard
          label="Average CSAT"
          value={avgRating}
          subtext="Customer satisfaction score"
          icon={Star}
          tone="warning"
        />
        <KpiStatCard
          label="Response Rate"
          value={responseRate}
          subtext="Replied or resolved cases"
          icon={CheckCircle2}
          tone="positive"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-slate-100 border border-slate-200 h-11 p-1 rounded-xl inline-flex w-full sm:w-auto overflow-x-auto scrollbar-hide">
          <TabsTrigger
            value="inbox"
            className="rounded-lg px-4 text-xs font-semibold gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <Layout className="h-4 w-4" /> Feedback Inbox
          </TabsTrigger>
          <TabsTrigger
            value="builder"
            className="rounded-lg px-4 text-xs font-semibold gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <Settings2 className="h-4 w-4" /> Form Designer
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="rounded-lg px-4 text-xs font-semibold gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <TrendingUp className="h-4 w-4" /> Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="m-0 space-y-5">
          <SectionCard
            title="Customer Submissions"
            description="Review ratings, update case priority, and reply directly to customers."
            headerRight={
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-36 rounded-xl bg-white border-slate-200 text-xs font-medium">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Submissions</SelectItem>
                    {Object.keys(STATUS_CONFIG).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_CONFIG[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="h-9 w-36 rounded-xl bg-white border-slate-200 text-xs font-medium">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Priorities</SelectItem>
                    {Object.keys(PRIORITY_CONFIG).map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_CONFIG[p].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 pl-9 rounded-xl border-slate-200 bg-white text-xs"
                  />
                </div>
              </div>
            }
            bodyClassName="p-0"
          >
            {filteredFeedbacks.length === 0 ? (
              <div className="p-6">
                <EmptyStatePanel
                  icon={MessageSquare}
                  title="No feedback submissions yet"
                  description="Share your public form link with customers after delivery or billing to start gathering reviews."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                      <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">
                        Customer
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 h-11">
                        Priority
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 h-11">
                        Category
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 h-11 text-center">
                        Rating
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 h-11 text-center">
                        Status
                      </TableHead>
                      <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11">
                        Received
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFeedbacks.map((f: any) => {
                      const pInfo = PRIORITY_CONFIG[f.priority || "medium"] || PRIORITY_CONFIG.medium;
                      const sInfo = STATUS_CONFIG[f.status || "new"] || STATUS_CONFIG.new;
                      return (
                        <TableRow
                          key={f.id}
                          className="group hover:bg-slate-50/70 transition-colors cursor-pointer border-b border-slate-100"
                          onClick={() => {
                            setSelectedFeedback(f);
                            setInternalNote(f.internalNotes || "");
                            setIsDetailOpen(true);
                          }}
                        >
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-slate-700 text-xs shrink-0">
                                {f.customerName?.charAt(0) || "C"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate group-hover:underline">
                                  {f.customerName}
                                </p>
                                <p className="text-xs text-slate-500 font-mono tabular-nums">
                                  {f.customerContact}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn("text-[11px] font-semibold px-2 py-0.5", pInfo.badgeClass)}
                            >
                              {pInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-[11px] font-medium px-2 py-0.5 border-slate-200 text-slate-700 bg-slate-50"
                            >
                              {f.category || "General"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex items-center justify-center gap-1 font-mono tabular-nums">
                              <span className="text-xs font-semibold text-slate-900">{f.rating}</span>
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={cn("text-[11px] font-semibold px-2 py-0.5", sInfo.badgeClass)}
                            >
                              {sInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              <div className="hidden group-hover:flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Inspect submission"
                                  className="h-8 w-8 rounded-lg text-slate-600 hover:bg-slate-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFeedback(f);
                                    setInternalNote(f.internalNotes || "");
                                    setIsDetailOpen(true);
                                  }}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Delete submission"
                                  className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50"
                                  onClick={(e) => openDeleteConfirm(e, f)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <span className="text-xs text-slate-500 font-mono tabular-nums group-hover:hidden">
                                {f.createdAt?.toDate
                                  ? f.createdAt.toDate().toLocaleDateString()
                                  : "Today"}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="builder" className="m-0 space-y-6">
          <SectionCard
            title="Form Header & Brand Preview"
            description="Customize logo, typography, and highlighted keywords shown on your public form."
            bodyClassName="p-0"
          >
            <div className="p-10 sm:p-14 bg-slate-50 text-center space-y-6 border-b border-slate-200">
              <div className="flex flex-col items-center gap-6">
                <div className="h-20 w-20 sm:h-24 sm:w-24 bg-white rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden">
                  {activeConfig?.logoUrl ? (
                    <img
                      src={activeConfig.logoUrl}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                      alt="Preview Logo"
                    />
                  ) : (
                    <div className="h-full w-full bg-slate-900 flex items-center justify-center text-white font-bold text-2xl">
                      B
                    </div>
                  )}
                </div>

                <Badge
                  variant="outline"
                  className="h-7 px-3 border-slate-300 bg-white text-slate-700 text-xs font-medium gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" /> We Value Your Voice
                </Badge>

                <div className="space-y-3">
                  <h2
                    className="text-slate-900 tracking-tight leading-tight px-4 max-w-3xl mx-auto font-bold"
                    style={{
                      fontFamily: activeConfig?.titleFont || "Mukta",
                      fontSize: `${activeConfig?.titleFontSize || 32}px`,
                    }}
                  >
                    <HighlightedText
                      text={activeConfig?.title || "Share Your Experience"}
                      highlight={activeConfig?.titleHighlightWord}
                      color={activeConfig?.titleHighlightColor}
                      isGradient={activeConfig?.titleHighlightGradient}
                      gradientEnd={activeConfig?.titleGradientEnd}
                    />
                  </h2>
                  <p
                    className="text-slate-600 font-medium leading-relaxed px-6 max-w-2xl mx-auto"
                    style={{
                      fontFamily: activeConfig?.descriptionFont || "Mukta",
                      fontSize: `${activeConfig?.descriptionFontSize || 16}px`,
                    }}
                  >
                    <HighlightedText
                      text={
                        activeConfig?.description ||
                        "Your feedback helps us innovate and provide better service to the community."
                      }
                      highlight={activeConfig?.descriptionHighlightWord}
                      color={activeConfig?.descriptionHighlightColor}
                      isGradient={activeConfig?.descriptionHighlightGradient}
                      gradientEnd={activeConfig?.descriptionGradientEnd}
                    />
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="border border-slate-200 p-5 rounded-xl bg-slate-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Form Custom Logo
                      </Label>
                      <p className="text-[11px] text-slate-500">Max 500KB recommended</p>
                    </div>
                    {activeConfig?.logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateConfig({ logoUrl: "" })}
                        className="h-7 px-2 text-rose-600 hover:bg-rose-50 text-xs"
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "w-full h-24 rounded-xl border border-dashed flex flex-col items-center justify-center gap-2 transition-colors",
                      activeConfig?.logoUrl
                        ? "border-slate-300 bg-white p-2"
                        : "border-slate-300 bg-white hover:border-slate-400"
                    )}
                  >
                    {activeConfig?.logoUrl ? (
                      <img
                        src={activeConfig.logoUrl}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain"
                        alt="Form Logo"
                      />
                    ) : (
                      <>
                        <Upload className="h-4 w-4 text-slate-500" />
                        <span className="text-xs font-medium text-slate-600">Upload Logo</span>
                      </>
                    )}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Main Heading</Label>
                    <Input
                      defaultValue={activeConfig?.title || ""}
                      onBlur={(e) => handleUpdateConfig({ title: e.target.value })}
                      placeholder="e.g. Share Your Experience"
                      className="h-10 rounded-xl border-slate-200 bg-white text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Sub-heading / Description
                    </Label>
                    <Textarea
                      defaultValue={activeConfig?.description || ""}
                      onBlur={(e) => handleUpdateConfig({ description: e.target.value })}
                      placeholder="e.g. Your feedback helps us innovate..."
                      className="min-h-[84px] rounded-xl border-slate-200 bg-white p-3 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2 border-t border-slate-100">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <FontIcon className="h-3.5 w-3.5 text-slate-500" /> Heading Font
                      </Label>
                      <Select
                        value={activeConfig?.titleFont || "Mukta"}
                        onValueChange={(v) => updateLocalAndBackend({ titleFont: v }, true)}
                      >
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {FONT_OPTIONS.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Maximize2 className="h-3.5 w-3.5 text-slate-500" /> Heading Size (px)
                      </Label>
                      <div className="flex items-center gap-3 h-10">
                        <Slider
                          value={[activeConfig?.titleFontSize || 32]}
                          max={80}
                          min={20}
                          step={1}
                          onValueChange={(v) => updateLocalAndBackend({ titleFontSize: v[0] })}
                          onValueCommit={(v) => handleUpdateConfig({ titleFontSize: v[0] })}
                          className="flex-1"
                        />
                        <span className="text-xs font-mono font-semibold w-8 text-right tabular-nums">
                          {activeConfig?.titleFontSize || 32}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">
                        Title Word Highlight
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Gradient</span>
                        <Switch
                          aria-label="Enable title gradient highlight"
                          checked={activeConfig?.titleHighlightGradient || false}
                          onCheckedChange={(v) =>
                            updateLocalAndBackend({ titleHighlightGradient: v }, true)
                          }
                        />
                      </div>
                    </div>
                    <Input
                      defaultValue={activeConfig?.titleHighlightWord || ""}
                      onBlur={(e) => handleUpdateConfig({ titleHighlightWord: e.target.value })}
                      placeholder="Word to highlight..."
                      className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">
                          {activeConfig?.titleHighlightGradient ? "Start Color" : "Highlight Color"}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            aria-label="Title highlight start color"
                            value={activeConfig?.titleHighlightColor || "#0C83B3"}
                            onChange={(e) =>
                              updateLocalAndBackend({ titleHighlightColor: e.target.value }, true)
                            }
                            className="h-9 w-10 p-1 rounded-lg border-slate-200"
                          />
                          <Input
                            value={activeConfig?.titleHighlightColor || "#0C83B3"}
                            onChange={(e) =>
                              updateLocalAndBackend({ titleHighlightColor: e.target.value }, true)
                            }
                            className="h-9 flex-1 rounded-lg text-xs font-mono border-slate-200"
                          />
                        </div>
                      </div>
                      {activeConfig?.titleHighlightGradient && (
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">End Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              aria-label="Title highlight end color"
                              value={activeConfig?.titleGradientEnd || "#2DD4BF"}
                              onChange={(e) =>
                                updateLocalAndBackend({ titleGradientEnd: e.target.value }, true)
                              }
                              className="h-9 w-10 p-1 rounded-lg border-slate-200"
                            />
                            <Input
                              value={activeConfig?.titleGradientEnd || "#2DD4BF"}
                              onChange={(e) =>
                                updateLocalAndBackend({ titleGradientEnd: e.target.value }, true)
                              }
                              className="h-9 flex-1 rounded-lg text-xs font-mono border-slate-200"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <FontIcon className="h-3.5 w-3.5 text-slate-500" /> Description Font
                      </Label>
                      <Select
                        value={activeConfig?.descriptionFont || "Mukta"}
                        onValueChange={(v) => updateLocalAndBackend({ descriptionFont: v }, true)}
                      >
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {FONT_OPTIONS.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Maximize2 className="h-3.5 w-3.5 text-slate-500" /> Desc Size (px)
                      </Label>
                      <div className="flex items-center gap-3 h-10">
                        <Slider
                          value={[activeConfig?.descriptionFontSize || 16]}
                          max={40}
                          min={12}
                          step={1}
                          onValueChange={(v) =>
                            updateLocalAndBackend({ descriptionFontSize: v[0] })
                          }
                          onValueCommit={(v) =>
                            handleUpdateConfig({ descriptionFontSize: v[0] })
                          }
                          className="flex-1"
                        />
                        <span className="text-xs font-mono font-semibold w-8 text-right tabular-nums">
                          {activeConfig?.descriptionFontSize || 16}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">
                        Description Word Highlight
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Gradient</span>
                        <Switch
                          aria-label="Enable description gradient highlight"
                          checked={activeConfig?.descriptionHighlightGradient || false}
                          onCheckedChange={(v) =>
                            updateLocalAndBackend({ descriptionHighlightGradient: v }, true)
                          }
                        />
                      </div>
                    </div>
                    <Input
                      defaultValue={activeConfig?.descriptionHighlightWord || ""}
                      onBlur={(e) =>
                        handleUpdateConfig({ descriptionHighlightWord: e.target.value })
                      }
                      placeholder="Word to highlight..."
                      className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">
                          {activeConfig?.descriptionHighlightGradient
                            ? "Start Color"
                            : "Highlight Color"}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            aria-label="Description highlight start color"
                            value={activeConfig?.descriptionHighlightColor || "#0C83B3"}
                            onChange={(e) =>
                              updateLocalAndBackend(
                                { descriptionHighlightColor: e.target.value },
                                true
                              )
                            }
                            className="h-9 w-10 p-1 rounded-lg border-slate-200"
                          />
                          <Input
                            value={activeConfig?.descriptionHighlightColor || "#0C83B3"}
                            onChange={(e) =>
                              updateLocalAndBackend(
                                { descriptionHighlightColor: e.target.value },
                                true
                              )
                            }
                            className="h-9 flex-1 rounded-lg text-xs font-mono border-slate-200"
                          />
                        </div>
                      </div>
                      {activeConfig?.descriptionHighlightGradient && (
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">End Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              aria-label="Description highlight end color"
                              value={activeConfig?.descriptionGradientEnd || "#2DD4BF"}
                              onChange={(e) =>
                                updateLocalAndBackend(
                                  { descriptionGradientEnd: e.target.value },
                                  true
                                )
                              }
                              className="h-9 w-10 p-1 rounded-lg border-slate-200"
                            />
                            <Input
                              value={activeConfig?.descriptionGradientEnd || "#2DD4BF"}
                              onChange={(e) =>
                                updateLocalAndBackend(
                                  { descriptionGradientEnd: e.target.value },
                                  true
                                )
                              }
                              className="h-9 flex-1 rounded-lg text-xs font-mono border-slate-200"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Form Security & Support"
            description="Control mobile verification and direct WhatsApp escalation."
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Mobile OTP Verification</p>
                    <p className="text-xs text-slate-500">
                      Require customers to verify their number via SMS before submitting
                    </p>
                  </div>
                </div>
                <Switch
                  aria-label="Toggle mobile OTP verification"
                  checked={formConfig?.isOtpEnabled || false}
                  onCheckedChange={(v) => handleUpdateConfig({ isOtpEnabled: v })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Support WhatsApp Number
                </Label>
                <div className="relative">
                  <SmartphoneNfc className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="e.g. 919876543210"
                    defaultValue={formConfig?.supportWhatsapp || ""}
                    onBlur={(e) =>
                      handleUpdateConfig({
                        supportWhatsapp: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    className="h-10 pl-10 rounded-xl border-slate-200 bg-white font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Used for the Immediate Help button on the customer tracking page.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Dynamic Form Designer"
            description="Configure and reorder fields for your public feedback page."
            headerRight={
              <Button
                type="button"
                onClick={handleAddField}
                className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 rounded-xl text-xs font-semibold gap-2"
              >
                <PlusCircle className="h-4 w-4" /> Add Field
              </Button>
            }
          >
            {formConfig?.fields?.length === 0 || !formConfig?.fields ? (
              <EmptyStatePanel
                icon={Layout}
                title="No custom fields yet"
                description="Click Add Field to create questions, ratings, or multi-choice selectors."
              />
            ) : (
              <div className="space-y-4">
                {formConfig.fields.map((field: any, index: number) => (
                  <div
                    key={field.id}
                    className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center">
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Move field up"
                            className="h-6 w-6 rounded-md"
                            onClick={() => {
                              const idx = formConfig.fields.findIndex(
                                (f: any) => f.id === field.id
                              );
                              if (idx > 0) {
                                const newFields = [...formConfig.fields];
                                [newFields[idx], newFields[idx - 1]] = [
                                  newFields[idx - 1],
                                  newFields[idx],
                                ];
                                handleUpdateConfig({ fields: newFields });
                              }
                            }}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-mono font-semibold text-xs text-slate-700">
                            {index + 1}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Move field down"
                            className="h-6 w-6 rounded-md"
                            onClick={() => {
                              const idx = formConfig.fields.findIndex(
                                (f: any) => f.id === field.id
                              );
                              if (idx < formConfig.fields.length - 1) {
                                const newFields = [...formConfig.fields];
                                [newFields[idx], newFields[idx + 1]] = [
                                  newFields[idx + 1],
                                  newFields[idx],
                                ];
                                handleUpdateConfig({ fields: newFields });
                              }
                            }}
                            disabled={index === formConfig.fields.length - 1}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <GripVertical className="h-4 w-4 text-slate-300" />
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">
                            Field Label / Heading
                          </Label>
                          <Input
                            value={field.label}
                            onChange={(e) => {
                              const updatedFields = formConfig.fields.map((f: any) =>
                                f.id === field.id ? { ...f, label: e.target.value } : f
                              );
                              handleUpdateConfig({ fields: updatedFields });
                            }}
                            className="h-10 rounded-xl border-slate-200 bg-white text-sm font-medium"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">
                            Input Type
                          </Label>
                          <Select
                            value={field.type}
                            onValueChange={(v) => {
                              const updatedFields = formConfig.fields.map((f: any) =>
                                f.id === field.id ? { ...f, type: v } : f
                              );
                              handleUpdateConfig({ fields: updatedFields });
                            }}
                          >
                            <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {FIELD_TYPES.map((t) => (
                                <SelectItem key={t.id} value={t.id} className="text-xs">
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end gap-4 pb-0.5">
                          {field.type !== "paragraph" && (
                            <div className="flex items-center gap-3 bg-white px-3.5 h-10 rounded-xl border border-slate-200">
                              <span className="text-xs font-medium text-slate-700">Required</span>
                              <Switch
                                aria-label="Toggle field required"
                                checked={field.required}
                                onCheckedChange={(v) => {
                                  const updatedFields = formConfig.fields.map((f: any) =>
                                    f.id === field.id ? { ...f, required: v } : f
                                  );
                                  handleUpdateConfig({ fields: updatedFields });
                                }}
                              />
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove field"
                            onClick={() => removeField(field.id)}
                            className="h-10 w-10 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {(field.type === "select" || field.type === "checkbox-group") && (
                      <div className="pt-3 border-t border-slate-200">
                        <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                          Available Options (Comma separated)
                        </Label>
                        <Input
                          placeholder="Option 1, Option 2, Option 3"
                          value={field.options || ""}
                          onChange={(e) => {
                            const updatedFields = formConfig.fields.map((f: any) =>
                              f.id === field.id ? { ...f, options: e.target.value } : f
                            );
                            handleUpdateConfig({ fields: updatedFields });
                          }}
                          className="h-10 rounded-xl border-slate-200 bg-white text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="analytics" className="m-0">
          <SectionCard>
            <EmptyStatePanel
              icon={TrendingUp}
              title="Detailed CSAT Reports Coming Soon"
              description="Trend breakdowns by category, sentiment score, and team response times will appear here."
            />
          </SectionCard>
        </TabsContent>
      </Tabs>

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col border-l border-slate-200 bg-white overflow-hidden">
          {selectedFeedback && (
            <>
              <SheetHeader className="p-6 bg-slate-900 text-white shrink-0 space-y-5 text-left">
                <div className="flex items-center justify-between gap-3">
                  <Badge
                    variant="outline"
                    className="bg-white/10 text-white border-white/20 font-mono text-xs px-2.5 py-0.5"
                  >
                    Submission #{selectedFeedback.id.slice(-8).toUpperCase()}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300">Status</span>
                    <Select
                      value={selectedFeedback.status}
                      onValueChange={(v) =>
                        updateFeedbackField(selectedFeedback.id, "status", v)
                      }
                    >
                      <SelectTrigger className="h-8 w-32 rounded-lg bg-white/10 border-white/20 text-white text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {Object.keys(STATUS_CONFIG).map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_CONFIG[s].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white font-bold text-xl shrink-0">
                    {selectedFeedback.customerName?.charAt(0) || "C"}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <SheetTitle className="text-lg font-bold text-white truncate">
                        {selectedFeedback.customerName}
                      </SheetTitle>
                      {selectedFeedback.isVerified && (
                        <BadgeCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-300 font-mono tabular-nums">
                        {selectedFeedback.customerContact}
                      </span>
                      <Separator orientation="vertical" className="h-3 bg-white/20" />
                      <div className="flex items-center gap-1 text-amber-400 font-mono tabular-nums">
                        <span className="font-semibold">{selectedFeedback.rating} / 5</span>
                        <Star className="h-3.5 w-3.5 fill-amber-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  <section className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                        <Settings2 className="h-4 w-4 text-slate-600" /> Internal Management
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Delete submission"
                        className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                        onClick={(e) => openDeleteConfirm(e, selectedFeedback)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Urgency Priority
                        </Label>
                        <Select
                          value={selectedFeedback.priority || "medium"}
                          onValueChange={(v) =>
                            updateFeedbackField(selectedFeedback.id, "priority", v)
                          }
                        >
                          <SelectTrigger className="h-9 rounded-xl bg-white border-slate-200 text-xs font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {Object.keys(PRIORITY_CONFIG).map((p) => (
                              <SelectItem key={p} value={p} className="text-xs">
                                {PRIORITY_CONFIG[p].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Team Assignment
                        </Label>
                        <div className="h-9 px-3 rounded-xl bg-white border border-dashed border-slate-300 flex items-center text-xs text-slate-500">
                          Owner Review
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Private Management Notes (Staff Only)
                      </Label>
                      <div className="relative">
                        <Textarea
                          placeholder="Internal comments, follow-up history..."
                          value={internalNote}
                          onChange={(e) => setInternalNote(e.target.value)}
                          className="min-h-[80px] rounded-xl bg-white border-slate-200 p-3 pr-10 text-xs"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Save internal note"
                          onClick={() =>
                            updateFeedbackField(
                              selectedFeedback.id,
                              "internalNotes",
                              internalNote
                            )
                          }
                          className="absolute bottom-2 right-2 h-7 w-7 bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                      <History className="h-4 w-4 text-slate-600" /> Message Logs
                    </h4>

                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs shrink-0">
                          {selectedFeedback.customerName?.charAt(0) || "C"}
                        </div>
                        <div className="flex-1 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                          {Object.entries(selectedFeedback.data || {}).map(
                            ([key, value]: [string, any]) => (
                              <div key={key} className="space-y-0.5">
                                <p className="text-xs font-medium text-slate-500">{key}</p>
                                <p className="text-sm font-medium text-slate-900">
                                  {Array.isArray(value) ? value.join(", ") : value?.toString()}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                      {(selectedFeedback.replies || []).map((reply: any, i: number) => (
                        <div
                          key={i}
                          className={cn(
                            "flex gap-3",
                            reply.role === "admin" ? "flex-row-reverse" : ""
                          )}
                        >
                          <div
                            className={cn(
                              "h-8 w-8 rounded-xl flex items-center justify-center font-semibold text-xs shrink-0",
                              reply.role === "admin"
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            )}
                          >
                            {reply.author?.charAt(0) || "A"}
                          </div>
                          <div
                            className={cn(
                              "flex-1",
                              reply.role === "admin" ? "text-right" : ""
                            )}
                          >
                            <div
                              className={cn(
                                "p-4 rounded-2xl border inline-block max-w-[85%] text-left",
                                reply.role === "admin"
                                  ? "bg-slate-900 text-white border-slate-800"
                                  : "bg-white border-slate-200 text-slate-900"
                              )}
                            >
                              <p className="text-sm leading-relaxed">{reply.text}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </ScrollArea>

              <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3 shrink-0">
                <div className="relative">
                  <Textarea
                    placeholder="Type official response..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-[88px] rounded-xl bg-white border-slate-200 p-3.5 pr-12 text-sm"
                  />
                  <Button
                    type="button"
                    aria-label="Send reply"
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || isReplying}
                    className="absolute bottom-3 right-3 h-9 w-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    {isReplying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-10 bg-white rounded-xl font-semibold text-xs border-slate-200"
                    onClick={() => setIsDetailOpen(false)}
                  >
                    Close Inspector
                  </Button>
                  {selectedFeedback.customerContact && (
                    <Button
                      asChild
                      variant="outline"
                      className="flex-1 h-10 bg-white rounded-xl font-semibold text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2"
                    >
                      <a
                        href={`https://wa.me/${selectedFeedback.customerContact.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <SmartphoneNfc className="h-4 w-4" /> WhatsApp
                      </a>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Delete submission"
                    className="h-10 w-10 rounded-xl text-rose-600 hover:bg-rose-50"
                    onClick={(e) => openDeleteConfirm(e, selectedFeedback)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-2xl border-slate-200 bg-white p-6">
          <AlertDialogHeader>
            <div className="h-11 w-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-3">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              Delete Feedback Ticket?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to permanently remove the feedback from{" "}
              <span className="font-semibold text-slate-900">
                {feedbackToDelete?.customerName}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-2.5">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="flex-1 h-10 rounded-xl font-semibold text-xs">
                Keep Ticket
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={() => handleDeleteFeedback(feedbackToDelete?.id)}
                className="flex-1 h-10 rounded-xl font-semibold text-xs bg-rose-600 hover:bg-rose-700 text-white border-none"
              >
                Delete Now
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
