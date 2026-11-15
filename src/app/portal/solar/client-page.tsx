
"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Sun, 
  Zap, 
  Target, 
  CheckCircle2, 
  ShieldCheck, 
  Loader2, 
  FileText, 
  Wrench, 
  Clock, 
  SmartphoneNfc, 
  Layout, 
  ArrowRight,
  ChevronRight,
  Calculator,
  Shield,
  History,
  Info,
  BadgeCheck,
  Smartphone,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Bot,
  BadgeCheck as VerifiedIcon,
  LogOut,
  Download,
  Eye,
  ImageIcon,
  ShieldAlert,
  Globe
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, initiateSignOut, useAuth } from "@/firebase";
import { collection, doc, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function SolarCustomerDashboard() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bIdFromUrl = searchParams.get('bId');

  // 1. Redirect if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push(`/portal/solar/login?bId=${bIdFromUrl || ''}`);
    }
  }, [user, isUserLoading, router, bIdFromUrl]);

  // 2. Resolve Customer Identity
  const customerPhone = useMemo(() => user?.phoneNumber?.replace('+91', '') || "", [user]);
  
  const [businessId, setBusinessId] = useState<string | null>(bIdFromUrl);
  const [customer, setCustomer] = useState<any>(null);
  const [isIdentityLoading, setIsIdentityLoading] = useState(true);

  useEffect(() => {
    async function resolveIdentity() {
      if (!customerPhone) return;
      setIsIdentityLoading(true);
      try {
        const businessesSnap = await getDocs(collection(firestore, 'businesses'));
        for (const bizDoc of businessesSnap.docs) {
          const custQuery = query(collection(firestore, 'businesses', bizDoc.id, 'customers'), where('phone', '==', customerPhone), limit(1));
          const custSnap = await getDocs(custQuery);
          if (!custSnap.empty) {
            setBusinessId(bizDoc.id);
            setCustomer({ ...custSnap.docs[0].data(), id: custSnap.docs[0].id });
            break;
          }
        }
      } catch (e) {
        console.error("Identity lookup failed", e);
      } finally {
        setIsIdentityLoading(false);
      }
    }
    if (user && !isUserLoading) resolveIdentity();
  }, [customerPhone, user, isUserLoading, firestore]);

  // 3. Fetch Authorized Data Nodes
  const installationsQuery = useMemoFirebase(() => 
    businessId && customer?.id ? query(collection(firestore, 'businesses', businessId, 'solarInstallations'), where('customerId', '==', customer.id)) : null
  , [firestore, businessId, customer?.id]);
  const { data: installations = [] } = useCollection<any>(installationsQuery);

  const plantsQuery = useMemoFirebase(() => 
    businessId && customer?.id ? query(collection(firestore, 'businesses', businessId, 'solarPlants'), where('customerId', '==', customer.id)) : null
  , [firestore, businessId, customer?.id]);
  const { data: plants = [] } = useCollection<any>(plantsQuery);

  const warrantiesQuery = useMemoFirebase(() => 
    businessId && customer?.id ? query(collection(firestore, 'businesses', businessId, 'solarWarranties'), where('customerId', '==', customer.id)) : null
  , [firestore, businessId, customer?.id]);
  const { data: warranties = [] } = useCollection<any>(warrantiesQuery);

  const serviceRequestsQuery = useMemoFirebase(() => 
    businessId && customer?.id ? query(collection(firestore, 'businesses', businessId, 'solarServiceRequests'), where('customerId', '==', customer.id), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId, customer?.id]);
  const { data: serviceRequests = [] } = useCollection<any>(serviceRequestsQuery);

  // FETCH CUSTOMER VISIBLE DOCUMENTS
  const docsQuery = useMemoFirebase(() => 
    businessId && customer?.id ? query(
      collection(firestore, 'businesses', businessId, 'solarDocuments'), 
      where('customerId', '==', customer.id),
      where('visibility', '==', 'CUSTOMER_VISIBLE'),
      orderBy('createdAt', 'desc')
    ) : null
  , [firestore, businessId, customer?.id]);
  const { data: documents = [] } = useCollection<any>(docsQuery);

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const activeInstall = installations[0] || null;
  const activePlant = plants[0] || null;
  const currencySymbol = getCurrencySymbol(business?.currency);

  const handleLogout = () => {
    initiateSignOut(auth).then(() => router.push('/'));
  };

  if (isUserLoading || isIdentityLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 pb-32 text-left">
      <header className="bg-white border-b h-16 sm:h-20 flex items-center sticky top-0 z-50 shadow-sm px-4">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between text-left">
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-border/10 shrink-0 overflow-hidden">
                {business?.logoUrl ? <img src={business.logoUrl} className="h-full w-full object-contain p-1" /> : <div className="h-full w-full bg-primary flex items-center justify-center text-white font-black">{business?.name?.charAt(0)}</div>}
             </div>
             <div className="flex flex-col min-w-0 text-left">
                <span className="text-xs sm:text-sm font-black text-slate-900 truncate leading-none uppercase">{business?.name}</span>
                <span className="text-[8px] sm:text-[9px] font-bold text-green-600 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                   <CheckCircle2 className="h-2.5 w-2.5" /> Client Portal Node
                </span>
             </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="h-9 rounded-xl text-destructive font-bold text-[10px] uppercase gap-2">
            <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-10 space-y-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
           <div className="space-y-2 text-left">
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none uppercase">Namaste, {customer?.name}!</h1>
              <p className="text-sm sm:text-lg text-muted-foreground font-medium">Welcome to your secure Solar command hub.</p>
           </div>
           {activePlant && (
             <div className="px-6 py-4 rounded-[2rem] bg-slate-900 text-white flex items-center gap-4 shadow-xl">
                <Globe className="h-7 w-7 text-accent animate-pulse" />
                <div className="text-left">
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Plant Node</p>
                   <p className="text-lg font-black">{activePlant.installedCapacityKwp} kWp Connected</p>
                </div>
             </div>
           )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">
            {/* ASSET OVERVIEW SECTION (NEW PHASE 16) */}
            {activePlant && (
              <section className="space-y-6 text-left animate-in fade-in duration-1000">
                <div className="flex items-center gap-3 px-2">
                  <Sun className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary">My Solar System Profile</h3>
                </div>
                <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden border">
                   <div className="p-8 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6 text-left">
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">System Type</p>
                            <p className="text-xl font-black text-slate-900 uppercase">{activePlant.systemType}</p>
                         </div>
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Installed Capacity</p>
                            <p className="text-2xl font-black text-primary">{activePlant.installedCapacityKwp} kWp</p>
                         </div>
                      </div>
                      <div className="space-y-6 text-left">
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Monitoring Status</p>
                            <Badge variant="outline" className={cn("h-6 px-3 border-none text-[8px] font-black uppercase", activePlant.monitoringStatus === 'READY' ? "bg-green-50 text-green-600" : "bg-muted text-slate-400")}>
                               {activePlant.monitoringStatus?.replace(/_/g, ' ') || 'NOT CONNECTED'}
                            </Badge>
                         </div>
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Asset Reference</p>
                            <p className="text-sm font-mono font-bold text-slate-500">{activePlant.plantReference}</p>
                         </div>
                      </div>
                   </div>
                   <CardFooter className="bg-muted/5 p-6 border-t flex flex-col gap-4 text-left">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Key Equipment Registry:</p>
                      <div className="flex flex-wrap gap-2">
                         {(activePlant.equipment || []).map((e: any, i: number) => (
                           <Badge key={i} variant="secondary" className="bg-white border-none text-[7px] font-black uppercase h-5 px-2 shadow-sm">{e.productName}</Badge>
                         ))}
                      </div>
                   </CardFooter>
                </Card>
              </section>
            )}

            {/* INSTALLATION ROADMAP (VISIBLE ONLY IF NOT YET PLANT) */}
            {activeInstall && !activePlant && (
              <section className="space-y-6 text-left">
                <div className="flex items-center justify-between px-2">
                   <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                     <Target className="h-4 w-4" /> Project Progress Node
                   </h3>
                   <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[9px] px-3 h-5 uppercase">
                     {activeInstall.status?.replace(/_/g, ' ')}
                   </Badge>
                </div>
                <Card className="border-none shadow-xl bg-white rounded-[2.5rem] p-8 sm:p-10 space-y-8 border">
                   <div className="space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                         <span>Installation Lifecycle</span>
                         <span className="text-primary">{activeInstall.progress || 0}% Complete</span>
                      </div>
                      <Progress value={activeInstall.progress || 0} className="h-2 bg-primary/10" />
                   </div>
                </Card>
              </section>
            )}

            {/* ASSET DOCUMENTS HUB */}
            <section className="space-y-6 text-left animate-in fade-in slide-in-from-bottom-2 duration-700">
               <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 px-2">
                 <FileText className="h-4 w-4" /> System Certificates & Assets
               </h3>
               {documents.length === 0 ? (
                 <Card className="p-10 text-center border-2 border-dashed rounded-[2.5rem] opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-widest italic">Technical documents pending node activation.</p>
                 </Card>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {documents.map((d: any) => (
                      <Card key={d.id} className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border group hover:shadow-xl transition-all text-left">
                         <CardContent className="p-6 space-y-4 text-left">
                            <div className="flex items-center justify-between mb-2">
                               <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:rotate-12 transition-transform shadow-inner">
                                  {d.documentType === 'INSTALLATION_PHOTO' ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                               </div>
                               <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[7px] font-black h-4 px-2 uppercase">Verified</Badge>
                            </div>
                            <div className="text-left">
                               <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate leading-tight">{d.title}</p>
                               <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1.5 tracking-tighter">{d.documentType?.replace(/_/g, ' ')} node</p>
                            </div>
                            <Button asChild variant="ghost" className="w-full h-10 rounded-xl border-2 border-dashed border-primary/10 text-primary text-[9px] font-black uppercase hover:bg-primary/5">
                               <a href={d.contentUrl || d.base64} target="_blank" rel="noopener noreferrer">
                                 {d.documentType?.includes('CERTIFICATE') ? <ShieldCheck className="h-3.5 w-3.5 mr-2" /> : <Eye className="h-3.5 w-3.5 mr-2" />}
                                 View Document
                               </a>
                            </Button>
                         </CardContent>
                      </Card>
                    ))}
                 </div>
               )}
            </section>
          </div>

          <div className="lg:col-span-4 space-y-8 text-left">
             <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden group">
                <CardHeader className="p-8 pb-4 text-left">
                   <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner group-hover:scale-110 transition-transform text-white">
                      <ShieldCheck className="h-6 w-6 text-accent" />
                   </div>
                   <CardTitle className="text-base font-black uppercase tracking-widest mt-4 leading-none text-white">Identity Handshake</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-6 text-left">
                   <div className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                         <div><p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Verified Identity</p><p className="text-sm font-black text-accent">{customerPhone}</p></div>
                         <VerifiedIcon className="h-5 w-5 text-green-400" />
                      </div>
                   </div>
                </CardContent>
             </Card>

             <Card className="border-none shadow-md bg-white rounded-[2rem] overflow-hidden border p-8 space-y-6 text-left">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><SmartphoneNfc className="h-4 w-4" /> Need Assistance?</h4>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">Our support node is active 10 AM to 7 PM. Use the direct WhatsApp trigger for faster resolution.</p>
                <Button className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl transition-all" onClick={() => window.open(`https://wa.me/${business?.phone?.replace(/\D/g, '')}`, '_blank')}>
                   Launch Support Chat
                </Button>
             </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
