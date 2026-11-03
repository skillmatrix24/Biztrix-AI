
"use client";

import { useState, useMemo } from "react";
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Layers, 
  Layout, 
  SmartphoneNfc, 
  Bot, 
  Wallet, 
  Briefcase, 
  Building2, 
  Gem, 
  Target, 
  Trophy, 
  Star, 
  Search, 
  Filter,
  Activity,
  BoxSelect,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Globe,
  Settings2,
  BadgeCheck,
  Receipt,
  ScanLine,
  MessageSquare,
  Ticket,
  Check,
  Circle,
  AlertTriangle,
  FileText,
  CornerDownRight,
  Database,
  Terminal,
  Cpu,
  Code,
  Share2,
  FileCode,
  Lock,
  Settings,
  Users,
  Smartphone,
  SearchCode,
  Handshake,
  Smartphone as PhoneIcon,
  Calculator,
  Flame,
  LayoutList,
  ShoppingBasket,
  Sun
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useUser } from "@/firebase";
import { cn } from "@/lib/utils";

type FeatureStatus = "Done" | "Progress" | "Planned";

type OSModule = {
  id: string;
  name: string;
  icon: any;
  description: string;
  features: {
    name: string;
    desc: string;
    status: FeatureStatus;
    tech?: string;
  }[];
};

const BLUEPRINT_DATA: OSModule[] = [
  {
    id: "infra",
    name: "Infrastructure & Security Node",
    icon: Database,
    description: "Core backend architecture and data safety layers.",
    features: [
      { name: "Multi-tenant Isolation", desc: "Strict separation of data between businesses using path-based Firestore queries.", status: "Done", tech: "Firestore Rules" },
      { name: "Global Security Rules v2.5", desc: "Verified access by request.auth and resource.data consistency checks.", status: "Done", tech: "Common CEL Functions" },
      { name: "Auto-Provisioning Node", desc: "Automatic creation of business root and default limits on first signup.", status: "Done", tech: "Auth Triggers" },
      { name: "256-bit SSL Data Path", desc: "Encrypted transmission between client-side SDKs and Google Cloud Workstations.", status: "Done", tech: "GCP Infrastructure" },
    ]
  },
  {
    id: "logic",
    name: "Developer Hub & Logic",
    icon: Terminal,
    description: "Internal systems for real-time reactivity and error handling.",
    features: [
      { name: "Global Error Emitter", desc: "Pub/Sub bus to catch and surface permission errors to development overlay.", status: "Done", tech: "Typed EventEmitter" },
      { name: "Memoized Firebase Hooks", desc: "Custom real-time hooks with dependency stabilization to prevent loops.", status: "Done", tech: "useMemoFirebase" },
      { name: "Non-Blocking CRUD", desc: "Optimistic UI updates via Firestore offline cache for high-speed POS.", status: "Done", tech: "Optimistic Persistence" },
      { name: "Universal Validator", desc: "Cross-module verification for Membership Cards, QR Codes, and Promo IDs.", status: "Done", tech: "Firestore Search Query" },
    ]
  },
  {
    id: "suite_solar",
    name: "Solar Business Suite",
    icon: Sun,
    description: "End-to-end solar lifecycle orchestration from lead to plant handover.",
    features: [
      { name: "Technical Design & BOM", desc: "Mapping of panels, inverters, and BOS to quotations with automatic tax nodes.", status: "Done", tech: "BOM Logic" },
      { name: "Atomic Material Issue", desc: "Hardened stock mutation using runTransaction to prevent negative inventory.", status: "Done", tech: "Firestore Transactions" },
      { name: "Handover Protocol", desc: "Automated Handover Certificate (PDF) generation from production data nodes.", status: "Done", tech: "jspdf / html2canvas" },
      { name: "Financial Accuracy Node", desc: "Distinction between Accepted Order Value and Collected Amount (No AR inflation).", status: "Done", tech: "Phase 12A Correction" },
      { name: "Solar Asset Registry", desc: "Persistent plant records with serial numbers, warranty links, and monitoring readiness.", status: "Done", tech: "Asset Matrix" },
    ]
  },
  {
    id: "marketplace",
    name: "Marketplace & Pro Suites",
    icon: ShoppingBasket,
    description: "Premium modules and advanced revenue-generating tools.",
    features: [
      { name: "Module Entitlement Engine", desc: "System to activate/deactivate suites based on business activeAddonIds.", status: "Done", tech: "Array Mapping" },
      { name: "Advanced OCR Engine", desc: "Vision AI to convert purchase bill photos into automated inventory nodes.", status: "Progress", tech: "Gemini Vision API" },
      { name: "ROI Telemetry (Growth)", desc: "Tracking actual conversion from WhatsApp broadcasts to financial ledger.", status: "Progress", tech: "Webhook Status Callbacks" },
      { name: "Predictive Reorder Math", desc: "AI scanning historical sales to suggest restocking before stockout.", status: "Progress", tech: "Historical Data Aggregation" },
      { name: "Agent Reward Matrix", desc: "Automated commission calculation based on deal stage 'Won'.", status: "Progress", tech: "Atomic Math" },
      { name: "Custom Domain Node", desc: "Linking external domains to generated public storefronts.", status: "Done", tech: "DNS Proxy Mapping" },
    ]
  },
  {
    id: "intelligence",
    name: "Advanced Intelligence (AI)",
    icon: Bot,
    description: "Cognitive services for data-grounded business insights.",
    features: [
      { name: "Conversational Advisor", desc: "Hinglish LLM agent aware of live inventory, leads, and sales velocity.", status: "Done", tech: "Genkit Flows + Handlebars" },
      { name: "Customer Risk Analysis", desc: "Scanning credit patterns and payment history to score reliability.", status: "Done", tech: "Cognitive Scoring" },
      { name: "Task SOP Generator", desc: "Decomposing goals into actionable sequential checklists using LLM logic.", status: "Done", tech: "Genkit Structured Output" },
      { name: "Spending Heatmap AI", desc: "Analyzing categorical outflows to identify cash leakages.", status: "Done", tech: "Recharts + Data Mining" },
    ]
  },
  {
    id: "growth",
    name: "Connectivity & WhatsApp",
    icon: SmartphoneNfc,
    description: "Official Meta API integrations for automated growth.",
    features: [
      { name: "Meta Cloud API Sync", desc: "Official integration for verified template dispatch and session messages.", status: "Done", tech: "OAuth 2.0" },
      { name: "Inbound Keyword Bot", desc: "Webhook handler for matching user messages to automated responses.", status: "Done", tech: "Route Handlers" },
      { name: "Nurturing Sequence Bot", desc: "Multi-step follow-ups for Birthday, Expiry, and Abandoned Inquiries.", status: "Done", tech: "Daily Cron Simulation" },
      { name: "Interactive Button Hub", desc: "Rich templates with Quick Replies and URL actions for higher CTR.", status: "Done", tech: "Meta Component UI" },
    ]
  },
  {
    id: "backoffice",
    name: "Back Office & Force Pro",
    icon: Briefcase,
    description: "Scaling tools for finance, workforce, and projects.",
    features: [
      { name: "Digital Salary Slips", desc: "Automated generation of monthly pay nodes with OT and Allowances.", status: "Done", tech: "Dynamic PDF/HTML Render" },
      { name: "Vendor Ledger (Running)", desc: "Statements showing every bill vs payment with current balance due.", status: "Done", tech: "Bidirectional Sync" },
      { name: "Project Financial Radar", desc: "Tracking profitability per project by subtracting staff and expense nodes.", status: "Done", tech: "Cross-collection Aggregation" },
      { name: "Staff Tracking Portal", desc: "Secure public access for specialists to view their own attendance and slips.", status: "Done", tech: "Public ID Redirection" },
    ]
  }
];

export default function PlatformBlueprintPage() {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const isPlatformOwner = user?.email?.toLowerCase() === 'skillmatrix24@gmail.com';

  const filteredData = useMemo(() => {
    return BLUEPRINT_DATA.filter(module => {
      const matchesSearch = module.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           module.features.some(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesTab = activeTab === "all" || module.id === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [searchTerm, activeTab]);

  const progressStats = useMemo(() => {
    let total = 0;
    let done = 0;
    BLUEPRINT_DATA.forEach(m => {
      m.features.forEach(f => {
        total++;
        if (f.status === "Done") done++;
      });
    });
    return Math.round((done / total) * 100);
  }, []);

  if (!isPlatformOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <ShieldCheck className="h-12 w-12 mb-4 text-muted-foreground" />
        <p className="text-sm font-bold uppercase tracking-widest text-center px-4 text-slate-900">Authorized Master Node Access Only</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 text-left max-w-5xl mx-auto px-1">
      {/* Header Section */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-2">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20 shrink-0">
            <Layers className="h-7 w-7 md:h-8 md:w-8" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Platform Blueprint</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider h-4 border-primary/20 text-primary bg-primary/5">Capabilities Manifest v3.5</Badge>
              <div className="flex items-center gap-1.5 ml-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Master Node Live</span>
              </div>
            </div>
          </div>
        </div>
        <Card className="border-none shadow-sm bg-white rounded-xl p-3 px-6 flex items-center gap-4 w-full sm:w-auto">
          <div className="text-right">
            <p className="text-[8px] font-black uppercase text-muted-foreground">Platform Sync</p>
            <p className="text-sm font-black text-primary">{progressStats}% Done</p>
          </div>
          <div className="w-20">
            <Progress value={progressStats} className="h-1.5 bg-primary/10" />
          </div>
        </Card>
      </div>

      {/* Global Search & Category Tabs */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
          <TabsList className="bg-white border-2 h-11 p-1 rounded-xl shadow-sm w-full overflow-x-auto scrollbar-hide flex">
            <TabsTrigger value="all" className="flex-1 text-[10px] font-black uppercase px-6">Global Node</TabsTrigger>
            <TabsTrigger value="suite_solar" className="flex-1 text-[10px] font-black uppercase px-6 text-orange-600">Solar OS</TabsTrigger>
            <TabsTrigger value="marketplace" className="flex-1 text-[10px] font-black uppercase px-6 text-primary">Marketplace</TabsTrigger>
            <TabsTrigger value="infra" className="flex-1 text-[10px] font-black uppercase px-6">Infra</TabsTrigger>
            <TabsTrigger value="intelligence" className="flex-1 text-[10px) font-black uppercase px-6">AI</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
          <Input 
            placeholder="Search capability / tech..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold w-full" 
          />
        </div>
      </div>

      {/* Main List Rendering */}
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
        {filteredData.length === 0 ? (
          <div className="py-20 text-center opacity-30 italic text-sm font-black uppercase">No capabilities match your query.</div>
        ) : filteredData.map((module) => {
          const ModuleIcon = module.icon;
          return (
            <section key={module.id} className="space-y-6">
              <div className="flex items-center gap-4 px-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20 shrink-0">
                  <ModuleIcon className="h-6 w-6" />
                </div>
                <div className="text-left">
                   <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">{module.name}</h3>
                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{module.description}</p>
                </div>
              </div>

              <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border mx-2">
                <div className="divide-y divide-border/40">
                  {module.features.map((feature, fIdx) => (
                    <div key={fIdx} className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6 hover:bg-muted/5 transition-all group">
                       <div className="flex items-start gap-5 flex-1 text-left">
                          <div className={cn(
                            "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border transition-all",
                            feature.status === 'Done' ? "bg-green-50 text-green-600 border-green-100" :
                            feature.status === 'Progress' ? "bg-primary/5 text-primary border-primary/10" :
                            "bg-slate-50 text-slate-400 border-slate-100"
                          )}>
                             {feature.status === 'Done' ? <CheckCircle2 className="h-6 w-6" /> : 
                              feature.status === 'Progress' ? <Zap className="h-6 w-6 animate-pulse" /> : 
                              <Circle className="h-6 w-6 opacity-20" />}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1.5">
                             <div className="flex items-center gap-3 flex-wrap">
                               <h4 className="text-base font-black uppercase text-slate-900 tracking-tight leading-none">{feature.name}</h4>
                               <Badge className={cn(
                                 "border-none text-[7px] font-black uppercase h-4 px-2 shadow-sm",
                                 feature.status === 'Done' ? "bg-green-600 text-white" :
                                 feature.status === 'Progress' ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                               )}>
                                 {feature.status === 'Done' ? 'Verified Node' : feature.status === 'Progress' ? 'Active Build' : 'Planned'}
                               </Badge>
                             </div>
                             <p className="text-sm font-medium text-slate-500 leading-relaxed italic">"{feature.desc}"</p>
                             {feature.tech && (
                               <div className="flex items-center gap-2 pt-1">
                                  <Code className="h-3 w-3 text-primary opacity-40" />
                                  <span className="text-[9px] font-mono font-black text-primary/60 uppercase tracking-tighter">Stack: {feature.tech}</span>
                               </div>
                             )}
                          </div>
                       </div>
                       <div className="hidden sm:flex items-center gap-3 shrink-0">
                          <div className="text-right">
                             <p className="text-[8px] font-black uppercase text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Logic Secure</p>
                             <div className="flex justify-end gap-1 mt-1">
                                <ShieldCheck className="h-3.5 w-3.5 text-green-600 opacity-10 group-hover:opacity-60 transition-all" />
                                <Lock className="h-3.5 w-3.5 text-primary opacity-10 group-hover:opacity-40 transition-all" />
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
                <CardFooter className="bg-muted/10 p-4 border-t flex items-center justify-between">
                   <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{module.features.length} Capability Nodes</span>
                   <ShieldCheck className="h-4 w-4 text-primary opacity-20" />
                </CardFooter>
              </Card>

              {/* Module Section Divider */}
              <div className="py-4 flex items-center gap-4 opacity-10">
                <div className="h-[2px] bg-primary flex-1" />
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="h-[2px] bg-primary flex-1" />
              </div>
            </section>
          );
        })}
      </div>

      {/* Footer / Summary Card */}
      <Card className="p-10 sm:p-16 bg-slate-900 text-white rounded-[3.5rem] space-y-10 relative overflow-hidden text-center shadow-2xl border-4 border-primary/20 mx-2">
        <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12"><Globe className="h-80 w-80" /></div>
        <div className="relative z-10 space-y-8">
           <div className="h-20 w-20 rounded-[2rem] bg-white/10 flex items-center justify-center mx-auto border border-white/20 shadow-inner group-hover:scale-110 transition-transform"><Sparkles className="h-10 w-10 text-accent fill-accent" /></div>
           <div className="space-y-4">
              <h3 className="text-3xl sm:text-5xl font-black tracking-tight uppercase leading-none">Marketplace Readiness</h3>
              <p className="text-sm sm:text-lg text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed uppercase tracking-tight">
                Marketplace ke premium modules jaise <strong>Advanced OCR</strong> aur <strong>Predictive Inventory</strong> abhi active development phase mein hain. Hum har deployment ke saath in nodes ko "Verified" status mein move kar rahe hain. 
              </p>
           </div>
           <div className="flex justify-center gap-10 text-[10px] font-black uppercase tracking-widest text-slate-500 flex-wrap">
              <div className="flex items-center gap-3"><div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" /> Deployed Node</div>
              <div className="flex items-center gap-3"><div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" /> In-Progress (WIP)</div>
              <div className="flex items-center gap-3"><div className="h-2.5 w-2.5 rounded-full bg-slate-600" /> Roadmap Node</div>
           </div>
        </div>
      </Card>
    </div>
  );
}
