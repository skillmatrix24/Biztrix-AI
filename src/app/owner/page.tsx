"use client";

import { useMemo, useState, useRef } from "react";
import { 
  ShieldCheck, 
  Users, 
  Building2, 
  CreditCard, 
  TrendingUp, 
  Zap, 
  ShoppingBasket,
  ArrowUpRight,
  Plus,
  Settings,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Activity,
  KeyRound,
  UserCog,
  Sparkles,
  Bot, 
  ArrowRight,
  RefreshCcw,
  DatabaseZap,
  LayoutDashboard,
  ImageIcon,
  Upload,
  X,
  Palette,
  Info,
  Globe,
  ExternalLink,
  ShieldAlert,
  Server,
  Lock,
  History,
  SmartphoneNfc,
  FileText,
  Terminal,
  ShieldQuestion
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useFirestore, useCollection, useMemoFirebase, useUser, updateDocumentNonBlocking, setDocumentNonBlocking, useDoc } from "@/firebase";
import { collection, doc, serverTimestamp, query, orderBy, limit } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { suggestUpsellModules } from "@/ai/flows/suggest-upsell-modules";
import { runCredentialMigration, MigrationReport } from "@/app/actions/p0-migration";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function OwnerOverviewPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const isPlatformOwner = user?.email?.toLowerCase() === 'skillmatrix24@gmail.com'; 
  
  // Platform Global Branding
  const globalBrandingRef = useMemoFirebase(() => doc(firestore, 'system', 'config', 'branding', 'main'), [firestore]);
  const { data: globalBranding } = useDoc<any>(globalBrandingRef);

  // Fetch All Businesses
  const businessesQuery = useMemoFirebase(() => {
    if (!isPlatformOwner) return null;
    return collection(firestore, 'businesses');
  }, [firestore, isPlatformOwner]);
  const { data: businesses, isLoading: bizLoading } = useCollection<any>(businessesQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!isPlatformOwner) return null;
    return collection(firestore, 'users');
  }, [firestore, isPlatformOwner]);
  const { data: allUsers, isLoading: usersLoading } = useCollection<any>(usersQuery);

  const featuresQuery = useMemoFirebase(() => {
    if (!isPlatformOwner) return null;
    return collection(firestore, 'system', 'config', 'marketplace');
  }, [firestore, isPlatformOwner]);
  const { data: features, isLoading: featLoading } = useCollection<any>(featuresQuery);

  const gatewaysQuery = useMemoFirebase(() => {
    if (!isPlatformOwner) return null;
    return collection(firestore, 'system', 'config', 'gateways');
  }, [firestore, isPlatformOwner]);
  const { data: gateways } = useCollection<any>(gatewaysQuery);

  // System Logs for "Proof"
  const logsQuery = useMemoFirebase(() => {
    if (!isPlatformOwner) return null;
    return query(collection(firestore, 'system', 'logs', 'payments'), orderBy('timestamp', 'desc'), limit(15));
  }, [firestore, isPlatformOwner]);
  const { data: auditLogs, isLoading: logsLoading } = useCollection<any>(logsQuery);

  // Batch Scan State
  const [isBatchScanning, setIsBatchScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Migration State
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationReport, setMigrationReport] = useState<MigrationReport | null>(null);

  const stats = useMemo(() => {
    return {
      totalUsers: allUsers?.length || 0,
      totalBusinesses: businesses?.length || 0,
      activeModules: features?.length || 0,
      activeGateways: gateways?.filter((g: any) => g.isActive).length || 0
    };
  }, [businesses, allUsers, features, gateways]);

  const upsellLeads = useMemo(() => {
    if (!businesses) return [];
    return businesses
      .filter((b: any) => b.aiUpsellInsight && b.aiUpsellInsight.suggestions?.length > 0)
      .slice(0, 4);
  }, [businesses]);

  const handleGlobalIdentityUpload = (e: React.ChangeEvent<HTMLInputElement>, key: 'logoUrl' | 'faviconUrl') => {
    if (!isPlatformOwner || !globalBrandingRef) return;
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast({ variant: "destructive", title: "File Too Large", description: "Identity assets must be under 500KB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentNonBlocking(globalBrandingRef, { [key]: reader.result as string, updatedAt: serverTimestamp() }, { merge: true });
        toast({ title: "Platform Identity Updated" });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeGlobalIdentity = (key: 'logoUrl' | 'faviconUrl') => {
    if (!globalBrandingRef) return;
    setDocumentNonBlocking(globalBrandingRef, { [key]: "" }, { merge: true });
    toast({ title: "Global Identity Reset" });
  };

  const runGlobalAnalysis = async () => {
    if (!businesses || businesses.length === 0 || !features) return;
    
    setIsBatchScanning(true);
    setScanProgress(0);
    let completed = 0;

    try {
      for (const biz of businesses) {
        const activeIds = biz.activeAddonIds || [];
        const available = features.filter((m: any) => !activeIds.includes(m.id) && m.isActive !== false);
        const activeNames = features.filter((m: any) => activeIds.includes(m.id)).map((m: any) => m.name);

        const result = await suggestUpsellModules({
          businessName: biz.name,
          activeModules: activeNames.length > 0 ? activeNames : ["Free Core OS"],
          availableModules: available.map((m: any) => ({
            name: m.name,
            description: m.description,
            price: m.price
          }))
        });

        const bizRef = doc(firestore, 'businesses', biz.id);
        updateDocumentNonBlocking(bizRef, {
          aiUpsellInsight: result,
          lastAiAnalysisAt: serverTimestamp()
        });

        completed++;
        setScanProgress(Math.round((completed / businesses.length) * 100));
      }
      toast({ title: "Platform Scan Complete" });
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Scan Failed" });
    } finally {
      setIsBatchScanning(false);
    }
  };

  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      const result = await runCredentialMigration();
      setMigrationReport(result);
      if (result.success) {
        toast({ title: "Migration Node Complete", description: "All secrets mirrored to private nodes." });
      }
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Migration Node Error" });
    } finally {
      setIsMigrating(false);
    }
  };

  if (!isPlatformOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <ShieldCheck className="h-12 w-12 mb-4 text-muted-foreground" />
        <p className="text-sm font-bold uppercase tracking-widest text-center px-4 text-slate-900">Authorized Master Node Access Only</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 text-left max-w-5xl mx-auto px-1">
      {/* Header Section */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-2">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20 shrink-0">
            <ShieldCheck className="h-7 w-7 md:h-8 md:w-8" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">Master Dashboard</h2>
            <p className="text-xs md:text-sm text-muted-foreground uppercase font-black tracking-widest">Global Platform Node</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          <Button 
            variant="outline" 
            disabled={isBatchScanning || bizLoading}
            onClick={runGlobalAnalysis}
            className="h-10 px-6 rounded-xl font-bold text-[10px] uppercase border-accent text-accent-foreground hover:bg-accent/5"
          >
            {isBatchScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
            {isBatchScanning ? `Scanning (${scanProgress}%)` : "Run AI Scan"}
          </Button>
          <Button asChild variant="outline" className="h-10 px-6 rounded-xl font-bold text-[10px] uppercase border-primary/20 text-primary">
            <Link href="/owner/users"><UserCog className="mr-2 h-4 w-4" /> Users</Link>
          </Button>
          <Button asChild className="bg-primary shadow-lg font-bold text-xs uppercase tracking-widest h-10 px-6 rounded-xl text-white">
            <Link href="/owner/marketplace"><Plus className="mr-2 h-4 w-4" /> Modules</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border border-border/50">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Tenants</p>
          <div className="text-2xl font-black text-slate-900">{stats.totalBusinesses} Active</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border border-border/50">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Users</p>
          <div className="text-2xl font-black text-slate-900">{stats.totalUsers} Profiles</div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-3xl p-6 border border-border/50">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Modules</p>
          <div className="text-2xl font-black text-slate-900">{stats.activeModules} Nodes</div>
        </Card>
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-3xl p-6">
          <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Gateways</p>
          <div className="text-2xl font-black text-white">{stats.activeGateways} Active</div>
        </Card>
      </div>

      {/* P0 SECURITY REMEDIATION CARD */}
      <section className="space-y-4 px-1">
        <div className="flex items-center gap-3 px-2">
          <Lock className="h-5 w-5 text-primary" />
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Security Remediation Hub</h3>
        </div>
        <Card className="border-none shadow-xl bg-slate-50 rounded-[2.5rem] overflow-hidden border border-primary/20">
          <div className="p-8 sm:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-8 space-y-4 text-left">
               <div className="flex items-center gap-3">
                  <Badge className="bg-red-500 text-white border-none text-[8px] font-black h-5 px-3 uppercase">P0 CRITICAL</Badge>
                  <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Credential Migration Protocol</h4>
               </div>
               <p className="text-sm text-slate-600 leading-relaxed font-medium">
                 Mirror all sensitive tokens and secrets from public tenant documents to strictly isolated <span className="text-primary font-black">privateConfig</span> nodes. 
                 This is a non-destructive COPY operation required for Stage 2 security hardening.
               </p>
               {migrationReport && (
                 <div className="grid grid-cols-2 gap-4 animate-in zoom-in-95 duration-500">
                    <div className="p-4 bg-white rounded-2xl border shadow-sm space-y-1">
                       <p className="text-[9px] font-black text-primary uppercase">WhatsApp Node</p>
                       <p className="text-lg font-black text-slate-900">{migrationReport.whatsapp.migrated} <span className="text-[8px] opacity-40 uppercase">Synced</span></p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border shadow-sm space-y-1">
                       <p className="text-[9px] font-black text-orange-600 uppercase">Gateway Node</p>
                       <p className="text-lg font-black text-slate-900">{migrationReport.payments.migrated} <span className="text-[8px] opacity-40 uppercase">Synced</span></p>
                    </div>
                 </div>
               )}
            </div>
            <div className="md:col-span-4">
               <Button 
                onClick={handleMigration} 
                disabled={isMigrating}
                className="w-full h-20 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-[1.5rem] shadow-2xl active:scale-95 transition-all group"
               >
                 {isMigrating ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : <RefreshCcw className="h-6 w-6 mr-3 group-hover:rotate-180 transition-transform duration-700" />}
                 Execute Migration
               </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* SYSTEM AUDIT TRAIL (PROOF OF DISPATCH) */}
      <section className="space-y-4 px-1">
        <div className="flex items-center justify-between px-2">
           <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">System Audit Trail (Proof)</h3>
           </div>
           <Badge variant="outline" className="text-[8px] font-black border-primary/20 text-primary h-5 px-2">LIVE LOGS</Badge>
        </div>
        <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border">
           <div className="overflow-x-auto scrollbar-hide">
              <Table>
                 <TableHeader><TableRow className="bg-muted/10"><TableHead className="pl-8 text-[10px] font-black uppercase h-12">Event & Timestamp</TableHead><TableHead className="text-[10px] font-black uppercase h-12">Recipient Context</TableHead><TableHead className="text-[10px] font-black uppercase h-12 text-center">Status</TableHead><TableHead className="text-right pr-8 text-[10px] font-black uppercase h-12">Action</TableHead></TableRow></TableHeader>
                 <TableBody>
                    {logsLoading ? (
                      <TableRow><TableCell colSpan={4} className="h-40 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary opacity-20" /></TableCell></TableRow>
                    ) : (!auditLogs || auditLogs.length === 0) ? (
                      <TableRow><TableCell colSpan={4} className="h-40 text-center opacity-30 italic text-xs font-black uppercase tracking-widest">No system logs recorded today.</TableCell></TableRow>
                    ) : (
                      auditLogs.map((log: any) => (
                        <TableRow key={log.id} className="border-b last:border-0 hover:bg-muted/5 transition-colors">
                           <TableCell className="pl-8 py-5">
                              <div className="flex flex-col">
                                 <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{log.event?.replace(/_/g, ' ')}</span>
                                 <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">{new Date(log.timestamp).toLocaleString('en-IN')}</span>
                              </div>
                           </TableCell>
                           <TableCell>
                              <div className="flex items-center gap-3">
                                 <div className="h-8 w-8 rounded-lg bg-muted/20 flex items-center justify-center shrink-0"><SmartphoneNfc className="h-4 w-4 text-primary" /></div>
                                 <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-700 truncate">{log.payload?.customerName || 'System Node'}</p>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase opacity-60">{log.payload?.targetPhone || 'N/A'}</p>
                                 </div>
                              </div>
                           </TableCell>
                           <TableCell className="text-center">
                              <Badge className={cn("text-[8px] font-black uppercase h-4 px-1.5 border-none shadow-sm", 
                                log.event?.includes('SUCCESS') ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"
                              )}>
                                {log.event?.includes('SUCCESS') ? 'DISPATCHED' : 'REJECTED'}
                              </Badge>
                           </TableCell>
                           <TableCell className="text-right pr-8">
                              <Dialog>
                                 <DialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 text-[8px] font-black uppercase text-primary gap-1">View Payload <ArrowRight className="h-2.5 w-2.5" /></Button></DialogTrigger>
                                 <DialogContent className="sm:max-w-[600px] rounded-3xl border-none shadow-2xl p-0 overflow-hidden text-left">
                                    <DialogHeader className="p-8 bg-slate-900 text-white"><DialogTitle>Audit Proof Details</DialogTitle></DialogHeader>
                                    <div className="p-8"><ScrollArea className="h-[400px] rounded-xl bg-muted/20 p-4 font-mono text-[10px] text-slate-700"><pre>{JSON.stringify(log.payload, null, 2)}</pre></ScrollArea></div>
                                 </DialogContent>
                              </Dialog>
                           </TableCell>
                        </TableRow>
                      ))
                    )}
                 </TableBody>
              </Table>
           </div>
        </Card>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden border">
            <CardHeader className="bg-primary/5 border-b py-6 px-8 text-left">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Palette className="h-4 w-4" /> Platform Global Assets
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Global Logo</Label>
                    {globalBranding?.logoUrl && (
                      <button onClick={() => removeGlobalIdentity('logoUrl')} className="h-6 px-2 text-destructive text-[9px] font-bold uppercase hover:bg-red-50 flex items-center gap-1">
                        <X className="h-3 w-3" /> Reset
                      </button>
                    )}
                  </div>
                  <div 
                    onClick={() => logoInputRef.current?.click()}
                    className={cn(
                      "h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group",
                      globalBranding?.logoUrl ? "border-primary/20 bg-primary/5 p-2" : "border-muted-foreground/20 bg-muted/10 hover:border-primary/40"
                    )}
                  >
                    {globalBranding?.logoUrl ? (
                      <img src={globalBranding.logoUrl} className="h-full w-full object-contain" alt="Global Logo" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <p className="text-[9px] font-bold text-muted-foreground uppercase text-center">Click to upload</p>
                      </>
                    )}
                  </div>
                  <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleGlobalIdentityUpload(e, 'logoUrl')} />
                </div>

                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Global Favicon</Label>
                    {globalBranding?.faviconUrl && (
                      <button onClick={() => removeGlobalIdentity('faviconUrl')} className="h-6 px-2 text-destructive text-[9px] font-bold uppercase hover:bg-red-50 flex items-center gap-1">
                        <X className="h-3 w-3" /> Reset
                      </button>
                    )}
                  </div>
                  <div 
                    onClick={() => faviconInputRef.current?.click()}
                    className={cn(
                      "h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group",
                      globalBranding?.faviconUrl ? "border-primary/20 bg-primary/5 p-8" : "border-muted-foreground/20 bg-muted/10 hover:border-primary/40"
                    )}
                  >
                    {globalBranding?.faviconUrl ? (
                      <img src={globalBranding.faviconUrl} className="h-full w-full object-contain shadow-md" alt="Global Favicon" />
                    ) : (
                      <>
                        <Zap className="h-5 w-5 text-muted-foreground" />
                        <p className="text-[9px] font-bold text-muted-foreground uppercase text-center">Favicon Node</p>
                      </>
                    )}
                  </div>
                  <input type="file" ref={faviconInputRef} className="hidden" accept="image/*" onChange={(e) => handleGlobalIdentityUpload(e, 'faviconUrl')} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <section className="space-y-4">
             <div className="flex items-center gap-3 px-2 text-left">
                <Bot className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Cross-Tenant AI Intelligence</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upsellLeads.length === 0 ? (
                  <div className="col-span-full p-20 text-center border-2 border-dashed rounded-[2.5rem] opacity-30 italic uppercase text-[10px] font-black">Waiting for Global Scan results.</div>
                ) : upsellLeads.map((biz: any) => (
                  <Card key={biz.id} className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border group">
                     <CardHeader className="bg-muted/30 border-b py-5 px-6">
                        <div className="flex items-center justify-between">
                           <p className="text-sm font-black text-slate-900 uppercase truncate max-w-[150px]">{biz.name}</p>
                           <Badge variant="outline" className="text-[7px] font-black uppercase border-primary/20 text-primary h-4">SYNCED</Badge>
                        </div>
                     </CardHeader>
                     <CardContent className="p-6 space-y-4">
                        {(biz.aiUpsellInsight?.suggestions || []).slice(0, 2).map((s: any, idx: number) => (
                          <div key={idx} className="flex gap-3 items-start text-left">
                             <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0"><Sparkles className="h-3.5 w-3.5" /></div>
                             <div className="space-y-0.5">
                                <p className="text-[10px] font-black text-slate-700 uppercase leading-tight">{s.moduleName}</p>
                                <p className="text-[9px] text-muted-foreground italic line-clamp-2">"{s.reasoning}"</p>
                             </div>
                          </div>
                        ))}
                     </CardContent>
                  </Card>
                ))}
             </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="border-none shadow-lg bg-slate-900 text-white rounded-3xl overflow-hidden group text-left">
            <CardContent className="p-8 space-y-8">
              <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-8 w-8 text-accent fill-accent" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold uppercase tracking-tight">Encrypted Payouts</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  All gateway credentials are encrypted with 256-bit AES at the node level. Hamare server pe secrets hamesha isolated rehte hain.
                </p>
              </div>
              <Separator className="bg-white/10" />
              <div className="space-y-5">
                 <div className="flex items-center gap-4">
                   <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-green-400 border border-white/5 shadow-inner"><CheckCircle2 className="h-5 w-5" /></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">PCI DSS Compliant Flow</span>
                 </div>
                 <div className="flex items-center gap-4">
                   <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-green-400 border border-white/5 shadow-inner"><CheckCircle2 className="h-5 w-5" /></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Direct Merchant Settlement</span>
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden border text-left">
             <CardHeader className="bg-muted/30 border-b py-5 px-6"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Info className="h-4 w-4" /> Platform Authority</CardTitle></CardHeader>
             <CardContent className="p-6">
                <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                  "As the master node owner, you can override tenant states and activate individual marketplace modules for premium businesses."
                </p>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
