
"use client";

import { useState, useMemo, useRef } from "react";
import { 
  MessageSquare, 
  Settings2, 
  Search, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Star, 
  Reply, 
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
  Tag, 
  Copy, 
  Check, 
  TrendingUp, 
  List, 
  ShieldCheck, 
  Calendar, 
  CheckSquare, 
  AlignLeft, 
  SquareCheck, 
  ArrowUp, 
  ArrowDown, 
  Palette,
  ImageIcon,
  X,
  Upload,
  Type as FontIcon,
  Maximize2,
  Monitor,
  Sparkles,
  ShieldAlert,
  Smartphone,
  BadgeCheck,
  AlertTriangle,
  Notebook,
  Filter,
  Save,
  MoreVertical,
  Edit2,
  Zap,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  TableRow 
} from "@/components/ui/table";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
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
  setDocumentNonBlocking,
  deleteDocumentNonBlocking 
} from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

const FONT_OPTIONS = [
  { id: 'Mukta', label: 'Mukta (Default)' },
  { id: 'Poppins', label: 'Poppins' },
  { id: 'Inter', label: 'Inter' },
  { id: 'Roboto', label: 'Roboto' },
  { id: 'Montserrat', label: 'Montserrat' },
  { id: 'Playfair Display', label: 'Playfair Display' },
  { id: 'Lato', label: 'Lato' },
  { id: 'Oswald', label: 'Oswald' },
  { id: 'Ubuntu', label: 'Ubuntu' },
  { id: 'Open Sans', label: 'Open Sans' },
];

const FIELD_TYPES = [
  { id: 'text', label: 'Single Line Input', icon: Type },
  { id: 'textarea', label: 'Long Description (User Detail)', icon: Type },
  { id: 'select', label: 'Dropdown Menu', icon: List },
  { id: 'checkbox-group', label: 'Checkbox Group (Multi-choice)', icon: SquareCheck },
  { id: 'paragraph', label: 'Instruction Paragraph (Admin)', icon: AlignLeft },
  { id: 'rating', label: 'Star Rating', icon: Star },
  { id: 'date', label: 'Date Selection', icon: Calendar },
  { id: 'checkbox', label: 'Single Checkbox (Toggle)', icon: CheckSquare },
];

const STATUS_CONFIG: any = {
  'new': { label: 'New', color: 'text-blue-600', bg: 'bg-blue-100/50' },
  'pending': { label: 'In Progress', color: 'text-orange-600', bg: 'bg-orange-100/50' },
  'resolved': { label: 'Resolved', color: 'text-green-600', bg: 'bg-green-100/50' },
  'closed': { label: 'Closed', color: 'text-slate-600', bg: 'bg-slate-100/50' },
};

const PRIORITY_CONFIG: any = {
  'low': { label: 'Low', color: 'text-slate-600', bg: 'bg-slate-100' },
  'medium': { label: 'Medium', color: 'text-blue-700', bg: 'bg-blue-100/60' },
  'high': { label: 'High', color: 'text-orange-700', bg: 'bg-orange-100/60' },
  'urgent': { label: 'Urgent', color: 'text-red-700', bg: 'bg-red-100/60' },
};

const HighlightedText = ({ 
  text, 
  highlight, 
  color,
  isGradient,
  gradientEnd
}: { 
  text: string, 
  highlight?: string, 
  color?: string,
  isGradient?: boolean,
  gradientEnd?: string
}) => {
  if (!highlight || !text || !highlight.trim()) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  
  const highlightStyle: React.CSSProperties = isGradient ? {
    backgroundImage: `linear-gradient(to right, ${color || '#0C83B3'}, ${gradientEnd || '#2DD4BF'})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'inline-block'
  } : {
    color: color || 'inherit'
  };
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} style={highlightStyle} className="font-black">
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

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const feedbackQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'feedback'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: feedbacksData, isLoading: isListLoading } = useCollection<any>(feedbackQuery);
  const feedbacks = feedbacksData || [];

  const configRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId, 'feedbackConfig', 'main') : null
  , [firestore, businessId]);
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

  // Delete Confirmation States
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<any>(null);

  const filteredFeedbacks = useMemo(() => {
    if (!feedbacks) return [];
    return feedbacks.filter((f: any) => {
      const matchesSearch = f.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
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
          description: "Please upload an image smaller than 500KB to ensure successful save." 
        });
        e.target.value = '';
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
      type: 'text', 
      label: 'New Field', 
      required: false, 
      options: "" 
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
    
    const feedbackRef = doc(firestore, 'businesses', businessId, 'feedback', selectedFeedback.id);
    const newReply = {
      text: replyText,
      author: userProfile?.name || 'Admin',
      timestamp: new Date().toISOString(),
      role: 'admin'
    };

    updateDocumentNonBlocking(feedbackRef, {
      replies: [...(selectedFeedback.replies || []), newReply],
      status: 'pending',
      updatedAt: serverTimestamp()
    });

    setReplyText("");
    setIsReplying(false);
    toast({ title: "Reply Sent" });
  };

  const updateFeedbackField = (id: string, key: string, value: any) => {
    if (!businessId) return;
    const feedbackRef = doc(firestore, 'businesses', businessId, 'feedback', id);
    updateDocumentNonBlocking(feedbackRef, { [key]: value });
    if (selectedFeedback && selectedFeedback.id === id) {
      setSelectedFeedback({ ...selectedFeedback, [key]: value });
    }
    toast({ title: "Updated" });
  };

  const handleDeleteFeedback = (id: string) => {
    if (!businessId) return;
    const feedbackRef = doc(firestore, 'businesses', businessId, 'feedback', id);
    deleteDocumentNonBlocking(feedbackRef);
    setIsDeleteAlertOpen(false);
    setIsDetailOpen(false);
    toast({ title: "Feedback Erased", variant: "destructive" });
  };

  const openDeleteConfirm = (e: React.MouseEvent, feedback: any) => {
    e.stopPropagation();
    setFeedbackToDelete(feedback);
    setIsDeleteAlertOpen(true);
  };

  const publicFormUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/feedback/form/${businessId}`;
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicFormUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({ title: "Link Copied" });
  };

  const activeConfig = localConfig || formConfig;

  const fontsToLoad = Array.from(new Set([activeConfig?.titleFont || 'Mukta', activeConfig?.descriptionFont || 'Mukta']));
  const fontUrl = `https://fonts.googleapis.com/css2?${fontsToLoad.map(f => `family=${f.replace(' ', '+')}:wght@400;700;900`).join('&')}&display=swap`;

  if (isConfigLoading || isListLoading) return <div className="flex items-center justify-center py-20 opacity-40"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 pb-10">
      <link rel="stylesheet" href={fontUrl} />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Feedback Hub</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Customer Voice & Response Center</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={handleCopyLink} className="h-10 px-4 rounded-xl font-bold text-[10px] uppercase gap-2">
             {isCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Globe className="h-3.5 w-3.5" />}
             Public Form Link
           </Button>
           <Button asChild className="h-10 px-6 rounded-xl font-black text-[10px] uppercase bg-slate-900 text-white shadow-lg">
             <Link href={`/feedback/form/${businessId}`} target="_blank">Open Form <ExternalLink className="ml-2 h-3.5 w-3.5" /></Link>
           </Button>
        </div>
      </div>

      {/* DASHBOARD STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-primary flex items-center justify-between group border">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Submissions</p>
            <div className="text-3xl font-black text-slate-900">{feedbacks.length}</div>
          </div>
          <History className="h-8 w-8 text-primary opacity-20 group-hover:scale-110 transition-transform" />
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-yellow-500 flex items-center justify-between group border">
          <div>
            <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-1">Average CSAT</p>
            <div className="text-3xl font-black text-slate-900">4.8 / 5.0</div>
          </div>
          <Star className="h-8 w-8 text-yellow-500 opacity-20 group-hover:scale-110 transition-transform fill-yellow-500" />
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border-l-4 border-l-green-500 flex items-center justify-between group border">
          <div>
            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Response Rate</p>
            <div className="text-3xl font-black text-slate-900">92%</div>
          </div>
          <CheckCircle2 className="h-8 w-8 text-green-600 opacity-20 group-hover:scale-110 transition-transform" />
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border h-12 p-1 rounded-xl shadow-sm mb-8 flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="inbox" className="flex-1 text-[10px] font-black uppercase px-8 gap-2">
            <Layout className="h-4 w-4" /> Feedback Inbox
          </TabsTrigger>
          <TabsTrigger value="builder" className="flex-1 text-[10px] font-black uppercase px-8 gap-2">
            <Settings2 className="h-4 w-4" /> Form Designer
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 text-[10px] font-black uppercase px-8 gap-2">
            <TrendingUp className="h-4 w-4" /> Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="m-0 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-2">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 w-full md:w-40 rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Submissions</SelectItem>
                  {Object.keys(STATUS_CONFIG).map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-11 w-full md:w-40 rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Priorities</SelectItem>
                  {Object.keys(PRIORITY_CONFIG).map(p => <SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
              <Input placeholder="Search customer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold" />
            </div>
          </div>

          <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 border-b">
                    <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Customer</TableHead>
                    <TableHead className="text-[10px] font-black uppercase h-12">Priority</TableHead>
                    <TableHead className="text-[10px] font-black uppercase h-12">Category</TableHead>
                    <TableHead className="text-[10px] font-black uppercase h-12 text-center">Rating</TableHead>
                    <TableHead className="text-[10px] font-black uppercase h-12 text-center">Status</TableHead>
                    <TableHead className="text-right pr-8 h-12 w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedbacks.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-60 text-center opacity-30 italic text-sm font-bold uppercase">No feedback yet.</TableCell></TableRow>
                  ) : (
                    filteredFeedbacks.map((f: any) => (
                      <TableRow key={f.id} className="group hover:bg-muted/5 transition-colors cursor-pointer border-b" onClick={() => { setSelectedFeedback(f); setInternalNote(f.internalNotes || ""); setIsDetailOpen(true); }}>
                        <TableCell className="pl-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-[10px] uppercase">
                              {f.customerName?.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-900 truncate group-hover:underline">{f.customerName}</p>
                              <p className="text-[10px] text-muted-foreground font-bold">{f.customerContact}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-[8px] font-black uppercase h-4 px-1.5 border-none", PRIORITY_CONFIG[f.priority || 'medium'].bg, PRIORITY_CONFIG[f.priority || 'medium'].color)}>
                            {PRIORITY_CONFIG[f.priority || 'medium'].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-primary/20 text-primary">
                            {f.category || 'General'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-xs font-black text-yellow-600">{f.rating}</span>
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn("text-[8px] font-black uppercase h-4 px-1.5 border-none", STATUS_CONFIG[f.status || 'new'].bg, STATUS_CONFIG[f.status || 'new'].color)}>
                            {STATUS_CONFIG[f.status || 'new'].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex items-center justify-end gap-2">
                             <div className="hidden group-hover:flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                               <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-primary" onClick={(e) => { e.stopPropagation(); setSelectedFeedback(f); setInternalNote(f.internalNotes || ""); setIsDetailOpen(true); }}>
                                 <Edit2 className="h-4 w-4" />
                               </Button>
                               <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive" onClick={(e) => openDeleteConfirm(e, f)}>
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             </div>
                             <span className="text-[9px] font-black text-slate-400 uppercase group-hover:hidden">
                              {f.createdAt?.toDate ? f.createdAt.toDate().toLocaleDateString() : 'Today'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="builder" className="m-0 space-y-8 animate-in fade-in">
          <Card className="border-none shadow-sm bg-white rounded-[2rem] border border-border/50">
            <CardHeader className="bg-muted/10 border-b py-5 px-8">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Palette className="h-4 w-4" /> Global Form Header & Highlighting
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-12 sm:p-20 bg-slate-50 text-center space-y-12 sm:space-y-16 border-b">
                <div className="flex flex-col items-center gap-10 sm:gap-14">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-primary/10 blur-[40px] rounded-full opacity-50" />
                    <div className="relative h-20 w-20 sm:h-28 sm:w-28 bg-white rounded-3xl flex items-center justify-center shadow-2xl border border-border/10 overflow-hidden transition-all">
                      {activeConfig?.logoUrl ? (
                        <img src={activeConfig.logoUrl} className="h-full w-full object-cover" alt="Preview Logo" />
                      ) : (
                        <div className="h-full w-full bg-primary flex items-center justify-center text-white font-black text-2xl sm:text-4xl">
                          B
                        </div>
                      )}
                    </div>
                  </div>

                  <Badge variant="outline" className="h-6 sm:h-7 px-3 sm:px-4 border-primary/20 bg-primary/5 text-primary text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] animate-fade-in">
                    <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-2 fill-current" /> We Value Your Voice
                  </Badge>

                  <div className="space-y-6 sm:space-y-8">
                    <h1 
                      className="text-slate-900 tracking-tight leading-[1.1] px-4 max-w-4xl mx-auto" 
                      style={{ 
                        fontFamily: activeConfig?.titleFont || 'Mukta', 
                        fontSize: `${activeConfig?.titleFontSize || 32}px` 
                      }}
                    >
                      <HighlightedText 
                          text={activeConfig?.title || "Share Your Experience"} 
                          highlight={activeConfig?.titleHighlightWord} 
                          color={activeConfig?.titleHighlightColor}
                          isGradient={activeConfig?.titleHighlightGradient}
                          gradientEnd={activeConfig?.titleGradientEnd}
                      />
                    </h1>
                    <p 
                      className="text-muted-foreground font-medium leading-relaxed px-6 max-w-2xl mx-auto text-sm sm:text-base opacity-80" 
                      style={{ 
                        fontFamily: activeConfig?.descriptionFont || 'Mukta', 
                        fontSize: `${activeConfig?.descriptionFontSize || 16}px` 
                      }}
                    >
                      <HighlightedText 
                          text={activeConfig?.description || "Your feedback helps us innovate and provide better service to the community."} 
                          highlight={activeConfig?.descriptionHighlightWord} 
                          color={activeConfig?.descriptionHighlightColor}
                          isGradient={activeConfig?.descriptionHighlightGradient}
                          gradientEnd={activeConfig?.descriptionGradientEnd}
                      />
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <Card className="border p-6 rounded-2xl bg-muted/5">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Form Custom Logo</Label>
                          <span className="text-[8px] text-primary/60 font-bold uppercase ml-1">Max 500KB for optimal performance</span>
                        </div>
                        {activeConfig?.logoUrl && (
                          <button onClick={() => handleUpdateConfig({ logoUrl: "" })} className="h-6 px-2 text-destructive text-[9px] font-bold uppercase hover:bg-red-50 flex items-center gap-1">
                            <X className="h-3 w-3" /> Remove
                          </button>
                        )}
                      </div>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group",
                          activeConfig?.logoUrl ? "border-primary/20 bg-primary/5 p-2 shadow-inner" : "border-muted-foreground/20 bg-muted/10 hover:border-primary/40"
                        )}
                      >
                        {activeConfig?.logoUrl ? (
                          <img src={activeConfig.logoUrl} className="h-full w-full object-contain" alt="Form Logo" />
                        ) : (
                          <>
                            <Upload className="h-5 w-5 text-muted-foreground" />
                            <p className="text-[8px] font-bold uppercase text-muted-foreground">Upload Logo</p>
                          </>
                        )}
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </div>
                  </Card>

                  <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Main Heading</Label>
                      <Input 
                        defaultValue={activeConfig?.title || ""} 
                        onBlur={(e) => handleUpdateConfig({ title: e.target.value })}
                        placeholder="e.g. Share Your Experience"
                        className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Sub-heading / Description</Label>
                      <Textarea 
                        defaultValue={activeConfig?.description || ""} 
                        onBlur={(e) => handleUpdateConfig({ description: e.target.value })}
                        placeholder="e.g. Your feedback helps us innovate..."
                        className="min-h-[80px] rounded-xl bg-muted/20 border-none shadow-inner p-4 text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-primary ml-1 flex items-center gap-2">
                          <FontIcon className="h-3 w-3" /> Heading Font
                        </Label>
                        <Select value={activeConfig?.titleFont || "Mukta"} onValueChange={(v) => updateLocalAndBackend({ titleFont: v }, true)}>
                          <SelectTrigger className="h-11 rounded-xl bg-white border-muted shadow-sm font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">{FONT_OPTIONS.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-primary ml-1 flex items-center gap-2">
                          <Maximize2 className="h-3 w-3" /> Heading Size (px)
                        </Label>
                        <div className="flex items-center gap-3">
                          <Slider 
                            value={[activeConfig?.titleFontSize || 32]} 
                            max={80} 
                            min={20} 
                            step={1}
                            onValueChange={(v) => updateLocalAndBackend({ titleFontSize: v[0] })}
                            onValueCommit={(v) => handleUpdateConfig({ titleFontSize: v[0] })}
                            className="flex-1"
                          />
                          <span className="text-xs font-bold w-8">{activeConfig?.titleFontSize || 32}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase text-primary ml-1">Title Word Highlight</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase opacity-60">Gradient</span>
                          <Switch 
                            checked={activeConfig?.titleHighlightGradient || false} 
                            onCheckedChange={(v) => updateLocalAndBackend({ titleHighlightGradient: v }, true)}
                            className="scale-75"
                          />
                        </div>
                      </div>
                      <Input 
                        defaultValue={activeConfig?.titleHighlightWord || ""} 
                        onBlur={(e) => handleUpdateConfig({ titleHighlightWord: e.target.value })}
                        placeholder="Word to highlight..."
                        className="h-10 rounded-xl bg-primary/5 border-none text-xs font-bold"
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-bold uppercase opacity-60">{activeConfig?.titleHighlightGradient ? 'Start Color' : 'Highlight Color'}</Label>
                          <div className="flex gap-2">
                            <Input type="color" value={activeConfig?.titleHighlightColor || "#0C83B3"} onChange={(e) => updateLocalAndBackend({ titleHighlightColor: e.target.value }, true)} className="h-8 w-8 p-1 rounded-md border-none" />
                            <Input value={activeConfig?.titleHighlightColor || "#0C83B3"} onChange={(e) => updateLocalAndBackend({ titleHighlightColor: e.target.value }, true)} className="h-8 flex-1 rounded-md text-[10px] font-mono" />
                          </div>
                        </div>
                        {activeConfig?.titleHighlightGradient && (
                          <div className="space-y-1.5 animate-in slide-in-from-left-1">
                            <Label className="text-[9px] font-bold uppercase opacity-60">End Color</Label>
                            <div className="flex gap-2">
                              <Input type="color" value={activeConfig?.titleGradientEnd || "#2DD4BF"} onChange={(e) => updateLocalAndBackend({ titleGradientEnd: e.target.value }, true)} className="h-8 p-1 rounded-md border-none" />
                              <Input value={activeConfig?.titleGradientEnd || "#2DD4BF"} onChange={(e) => updateLocalAndBackend({ titleGradientEnd: e.target.value }, true)} className="h-8 flex-1 rounded-md text-[10px] font-mono" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-primary ml-1 flex items-center gap-2">
                          <FontIcon className="h-3 w-3" /> Description Font
                        </Label>
                        <Select value={activeConfig?.descriptionFont || "Mukta"} onValueChange={(v) => updateLocalAndBackend({ descriptionFont: v }, true)}>
                          <SelectTrigger className="h-11 rounded-xl bg-white border-muted shadow-sm font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">{FONT_OPTIONS.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-primary ml-1 flex items-center gap-2">
                          <Maximize2 className="h-3 w-3" /> Desc Size (px)
                        </Label>
                        <div className="flex items-center gap-3">
                          <Slider 
                            value={[activeConfig?.descriptionFontSize || 16]} 
                            max={40} 
                            min={12} 
                            step={1}
                            onValueChange={(v) => updateLocalAndBackend({ descriptionFontSize: v[0] })}
                            onValueCommit={(v) => handleUpdateConfig({ descriptionFontSize: v[0] })}
                            className="flex-1"
                          />
                          <span className="text-xs font-bold w-8">{activeConfig?.descriptionFontSize || 16}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase text-primary ml-1">Desc Word Highlight</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase opacity-60">Gradient</span>
                          <Switch 
                            checked={activeConfig?.descriptionHighlightGradient || false} 
                            onCheckedChange={(v) => updateLocalAndBackend({ descriptionHighlightGradient: v }, true)}
                            className="scale-75"
                          />
                        </div>
                      </div>
                      <Input 
                        defaultValue={activeConfig?.descriptionHighlightWord || ""} 
                        onBlur={(e) => handleUpdateConfig({ descriptionHighlightWord: e.target.value })}
                        placeholder="Word to highlight..."
                        className="h-10 rounded-xl bg-primary/5 border-none text-xs font-bold"
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-bold uppercase opacity-60">{activeConfig?.descriptionHighlightGradient ? 'Start Color' : 'Highlight Color'}</Label>
                          <div className="flex gap-2">
                            <Input type="color" value={activeConfig?.descriptionHighlightColor || "#0C83B3"} onChange={(e) => updateLocalAndBackend({ descriptionHighlightColor: e.target.value }, true)} className="h-8 w-8 p-1 rounded-md border-none" />
                            <Input value={activeConfig?.descriptionHighlightColor || "#0C83B3"} onChange={(e) => updateLocalAndBackend({ descriptionHighlightColor: e.target.value }, true)} className="h-8 flex-1 rounded-md text-[10px] font-mono" />
                          </div>
                        </div>
                        {activeConfig?.descriptionHighlightGradient && (
                          <div className="space-y-1.5 animate-in slide-in-from-left-1">
                            <Label className="text-[9px] font-bold uppercase opacity-60">End Color</Label>
                            <div className="flex gap-2">
                              <Input type="color" value={activeConfig?.descriptionGradientEnd || "#2DD4BF"} onChange={(e) => updateLocalAndBackend({ descriptionGradientEnd: e.target.value }, true)} className="h-8 p-1 rounded-md border-none" />
                              <Input value={activeConfig?.descriptionGradientEnd || "#2DD4BF"} onChange={(e) => updateLocalAndBackend({ descriptionGradientEnd: e.target.value }, true)} className="h-8 flex-1 rounded-md text-[10px] font-mono" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden border">
            <CardHeader className="bg-muted/10 border-b py-5 px-8">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Form Security & Support
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center justify-between p-6 bg-muted/20 rounded-2xl border border-transparent hover:border-primary/20 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Mobile OTP Verification</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Require customers to verify their number via SMS before submitting</p>
                  </div>
                </div>
                <Switch 
                  checked={formConfig?.isOtpEnabled || false} 
                  onCheckedChange={(v) => handleUpdateConfig({ isOtpEnabled: v })} 
                  className="scale-75 data-[state=checked]:bg-primary" 
                />
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Support WhatsApp Number</Label>
                <div className="relative">
                  <SmartphoneNfc className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 opacity-40" />
                  <Input 
                    placeholder="e.g. 919876543210" 
                    defaultValue={formConfig?.supportWhatsapp || ""}
                    onBlur={(e) => handleUpdateConfig({ supportWhatsapp: e.target.value.replace(/\D/g, '') })}
                    className="h-12 pl-12 rounded-xl bg-muted/20 border-none shadow-inner font-bold" 
                  />
                </div>
                <p className="text-[9px] text-muted-foreground uppercase font-bold px-1">This number will be used for the "Immediate Help" button on the customer tracking page.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border border-border/50">
            <CardHeader className="bg-primary/5 border-b p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg">
                    <Layout className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">Dynamic Form Designer</CardTitle>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Configure fields for the public feedback page</p>
                  </div>
                </div>
                <Button onClick={handleAddField} className="bg-primary hover:bg-primary/90 text-white h-11 px-6 rounded-xl font-black text-[10px] uppercase shadow-lg">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6">
                {formConfig?.fields?.length === 0 ? (
                  <div className="p-20 text-center opacity-30 border-2 border-dashed rounded-3xl">
                    <p className="text-sm font-bold uppercase tracking-widest">No custom fields. Click "Add Field" to start.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {formConfig?.fields?.map((field: any, index: number) => (
                      <div key={field.id} className="p-6 bg-muted/20 rounded-[2rem] border border-transparent hover:border-primary/20 transition-all group animate-in slide-in-from-left-2 duration-300">
                        <div className="flex flex-col lg:flex-row gap-8 items-start">
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="flex flex-col gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-primary/10" onClick={() => {
                                const index = formConfig.fields.findIndex((f: any) => f.id === field.id);
                                if (index > 0) {
                                  const newFields = [...formConfig.fields];
                                  [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
                                  handleUpdateConfig({ fields: newFields });
                                }
                              }} disabled={index === 0}>
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-black text-[10px] text-primary">{index + 1}</div>
                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-primary/10" onClick={() => {
                                const index = formConfig.fields.findIndex((f: any) => f.id === field.id);
                                if (index < formConfig.fields.length - 1) {
                                  const newFields = [...formConfig.fields];
                                  [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
                                  handleUpdateConfig({ fields: newFields });
                                }
                              }} disabled={index === formConfig.fields.length - 1}>
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <GripVertical className="h-4 w-4 opacity-20" />
                          </div>
                          
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Field Label / Heading</Label>
                              <Input value={field.label} onChange={(e) => {
                                const updatedFields = formConfig.fields.map((f: any) => f.id === field.id ? { ...f, label: e.target.value } : f);
                                handleUpdateConfig({ fields: updatedFields });
                              }} className="h-11 rounded-xl bg-white border-none shadow-sm font-bold" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Input Type</Label>
                              <Select value={field.type} onValueChange={(v) => {
                                const updatedFields = formConfig.fields.map((f: any) => f.id === field.id ? { ...f, type: v } : f);
                                handleUpdateConfig({ fields: updatedFields });
                              }}>
                                <SelectTrigger className="h-11 rounded-xl bg-white border-none shadow-sm font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                  {FIELD_TYPES.map(t => <SelectItem key={t.id} value={t.id} className="text-xs font-bold">{t.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end pb-1 gap-6">
                              {field.type !== 'paragraph' && (
                                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border shadow-sm">
                                  <span className="text-[10px] font-black uppercase">Required</span>
                                  <Switch checked={field.required} onCheckedChange={(v) => {
                                    const updatedFields = formConfig.fields.map((f: any) => f.id === field.id ? { ...f, required: v } : f);
                                    handleUpdateConfig({ fields: updatedFields });
                                  }} className="scale-75 data-[state=checked]:bg-primary" />
                                </div>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => removeField(field.id)} className="h-10 w-10 text-destructive/40 hover:text-destructive hover:bg-destructive/5 rounded-xl transition-all">
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {(field.type === 'select' || field.type === 'checkbox-group') && (
                          <div className="mt-6 pt-6 border-t border-dashed border-border/50 animate-in zoom-in-95">
                            <Label className="text-[10px] font-black uppercase text-primary mb-2 block">Available Options (Comma separated)</Label>
                            <Input placeholder="Option 1, Option 2, Option 3" value={field.options || ""} onChange={(e) => {
                              const updatedFields = formConfig.fields.map((f: any) => f.id === field.id ? { ...f, options: e.target.value } : f);
                              handleUpdateConfig({ fields: updatedFields });
                            }} className="h-11 rounded-xl bg-white border-none shadow-sm font-bold" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="m-0">
          <Card className="p-12 text-center bg-white rounded-[2.5rem] border border-dashed opacity-30">
            <TrendingUp className="h-12 w-12 mx-auto mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">More detailed analytics coming soon...</p>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col border-none shadow-2xl bg-background overflow-hidden">
          {selectedFeedback && (
            <>
              <SheetHeader className="p-8 bg-primary text-white shrink-0 relative">
                <div className="absolute top-0 right-0 p-8 opacity-10"><MessageSquare className="h-40 w-40" /></div>
                <div className="text-left space-y-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-white/10 text-white border-white/20 uppercase text-[9px] font-black px-3 py-1 tracking-widest">SUBMISSION: {selectedFeedback.id.slice(-8).toUpperCase()}</Badge>
                    <div className="flex flex-row items-center gap-3">
                       <span className="text-[10px] font-bold text-white/60 uppercase">Status:</span>
                       <Select value={selectedFeedback.status} onValueChange={(v) => updateFeedbackField(selectedFeedback.id, 'status', v)}>
                        <SelectTrigger className="h-8 w-32 rounded-xl bg-white/10 border-white/20 text-white text-[10px] font-black uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {Object.keys(STATUS_CONFIG).map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="h-20 w-20 rounded-3xl bg-white flex items-center justify-center text-primary font-black text-3xl shrink-0 shadow-2xl">
                      {selectedFeedback.customerName?.charAt(0)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SheetTitle className="text-2xl font-black text-white">{selectedFeedback.customerName}</SheetTitle>
                        {selectedFeedback.isVerified && <BadgeCheck className="h-5 w-5 text-accent" />}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-accent text-[10px] font-bold uppercase tracking-widest">{selectedFeedback.customerContact}</span>
                        <Separator orientation="vertical" className="h-3 bg-white/20" />
                        <div className="flex items-center gap-1.5 text-yellow-400">
                          <span className="text-xs font-black">{selectedFeedback.rating} / 5</span>
                          <Star className="h-4 w-4 fill-yellow-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1 p-8 scrollbar-hide">
                <div className="space-y-10">
                  {/* Management Console (Priority & Internal Notes) */}
                  <section className="p-6 bg-muted/20 rounded-3xl border border-border/50 space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Settings2 className="h-4 w-4" /> Internal Management
                      </h4>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => openDeleteConfirm(e, selectedFeedback)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase opacity-60 ml-1">Urgency Priority</Label>
                        <Select value={selectedFeedback.priority || "medium"} onValueChange={(v) => updateFeedbackField(selectedFeedback.id, 'priority', v)}>
                          <SelectTrigger className="h-10 rounded-xl bg-white font-bold text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {Object.keys(PRIORITY_CONFIG).map(p => (
                              <SelectItem key={p} value={p} className="text-xs font-bold uppercase">{PRIORITY_CONFIG[p].label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[9px] font-black uppercase opacity-60 ml-1">Team Assignment</Label>
                         <Badge variant="outline" className="h-10 w-full flex items-center justify-center bg-white text-[10px] font-bold border-dashed">Select Specialist</Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[9px] font-black uppercase opacity-60 ml-1">Private Management Notes (Staff Only)</Label>
                       <div className="relative">
                         <Textarea 
                           placeholder="Internal comments, follow-up history..." 
                           value={internalNote}
                           onChange={(e) => setInternalNote(e.target.value)}
                           className="min-h-[80px] rounded-xl bg-white border-none shadow-inner p-3 text-xs font-medium"
                         />
                         <Button 
                           size="icon" 
                           variant="ghost" 
                           onClick={() => updateFeedbackField(selectedFeedback.id, 'internalNotes', internalNote)}
                           className="absolute bottom-2 right-2 h-7 w-7 bg-primary/10 text-primary hover:bg-primary/20"
                         >
                           <Save className="h-3.5 w-3.5" />
                         </Button>
                       </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><History className="h-4 w-4" /> Message Logs</h4>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] shrink-0">{selectedFeedback.customerName?.charAt(0)}</div>
                        <div className="flex-1 space-y-4">
                           <div className="p-6 bg-muted/20 rounded-3xl rounded-tl-none border border-transparent space-y-6">
                              {Object.entries(selectedFeedback.data || {}).map(([key, value]: [string, any]) => (
                                <div key={key} className="space-y-1">
                                  <p className="text-[8px] font-black text-primary uppercase tracking-widest opacity-60">{key}</p>
                                  <p className="text-sm font-bold text-slate-700">{Array.isArray(value) ? value.join(', ') : value.toString()}</p>
                                </div>
                              ))}
                           </div>
                        </div>
                      </div>
                      {(selectedFeedback.replies || []).map((reply: any, i: number) => (
                        <div key={i} className={cn("flex gap-4 animate-in slide-in-from-bottom-2", reply.role === 'admin' ? "flex-row-reverse" : "")}>
                          <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0", reply.role === 'admin' ? "bg-slate-900 text-white" : "bg-primary/10 text-primary")}>
                            {reply.author?.charAt(0)}
                          </div>
                          <div className={cn("flex-1 space-y-2", reply.role === 'admin' ? "text-right" : "")}>
                            <div className={cn("p-5 rounded-3xl border shadow-sm inline-block max-w-[85%]", reply.role === 'admin' ? "bg-slate-900 text-white border-slate-800 rounded-tr-none" : "bg-white border-border/50 rounded-tl-none")}>
                               <p className="text-sm font-medium leading-relaxed">{reply.text}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </ScrollArea>

              <div className="p-8 border-t bg-muted/20 space-y-4 shrink-0">
                <div className="relative">
                  <Textarea 
                    placeholder="Type official response..." 
                    value={replyText} 
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-[100px] rounded-2xl bg-white border-none shadow-xl p-4 pr-14 text-sm font-bold"
                  />
                  <Button 
                    onClick={handleSendReply} 
                    disabled={!replyText.trim() || isReplying}
                    className="absolute bottom-3 right-3 h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg"
                  >
                    {isReplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex gap-3">
                   <Button variant="outline" className="flex-1 h-12 bg-white rounded-xl font-black uppercase text-[10px] tracking-widest border-border shadow-sm" onClick={() => setIsDetailOpen(false)}>Close Inspector</Button>
                   <Button variant="outline" className="flex-1 h-12 bg-white rounded-xl font-black uppercase text-[10px] tracking-widest border-green-200 text-green-600 shadow-sm gap-2" onClick={() => window.open(`https://wa.me/${selectedFeedback.customerContact.replace(/\D/g, '')}`)}>
                     <SmartphoneNfc className="h-4 w-4" /> WhatsApp
                   </Button>
                   <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-destructive hover:bg-destructive/5" onClick={(e) => openDeleteConfirm(e, selectedFeedback)}>
                     <Trash2 className="h-5 w-5" />
                   </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-4">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-xl font-black">Erase Feedback Ticket?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-slate-500 leading-relaxed">
              Are you sure you want to permanently remove the feedback from <span className="font-bold text-slate-900">"{feedbackToDelete?.customerName}"</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex gap-3">
            <AlertDialogCancel asChild><Button variant="outline" className="flex-1 h-12 rounded-xl font-bold uppercase">Keep Ticket</Button></AlertDialogCancel>
            <AlertDialogAction asChild><Button onClick={() => handleDeleteFeedback(feedbackToDelete?.id)} className="flex-1 h-12 rounded-xl font-black uppercase bg-destructive hover:bg-destructive/90 text-white border-none shadow-lg">Erase Now</Button></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
