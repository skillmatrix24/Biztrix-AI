"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Sun, 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  Wrench, 
  Smartphone, 
  User, 
  Building2, 
  Info,
  ArrowRight,
  Sparkles,
  MessageSquare,
  SmartphoneNfc,
  ImageIcon,
  X,
  MapPin,
  Upload,
  Bot
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking, useUser } from "@/firebase";
import { doc, collection, serverTimestamp, getDocs, query, where, limit } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const CATEGORIES = [
  { id: 'GENERAL_SERVICE', label: 'General Service' },
  { id: 'SYSTEM_FAULT', label: 'System Fault (No Generation)' },
  { id: 'PANEL_ISSUE', label: 'Physical Panel Issue' },
  { id: 'INVERTER_ISSUE', label: 'Inverter/Display Issue' },
  { id: 'MONITORING_ISSUE', label: 'App/Monitoring Offline' },
  { id: 'WARRANTY_CLAIM', label: 'Warranty Payout Claim' },
];

export default function PublicServiceRequestForm() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bIdFromUrl = searchParams.get('bId');

  const [customer, setCustomer] = useState<any>(null);
  const [businessId, setBusinessId] = useState<string | null>(bIdFromUrl);
  const [isIdentityLoading, setIsIdentityLoading] = useState(true);

  // 1. Resolve Identity and Parent Business
  useEffect(() => {
    async function resolve() {
      if (isUserLoading || !user?.phoneNumber) return;
      setIsIdentityLoading(true);
      try {
        const phone = user.phoneNumber.replace('+91', '');
        const businessesSnap = await getDocs(collection(firestore, 'businesses'));
        for (const bizDoc of businessesSnap.docs) {
          const q = query(collection(firestore, 'businesses', bizDoc.id, 'customers'), where('phone', '==', phone), limit(1));
          const s = await getDocs(q);
          if (!s.empty) {
            setBusinessId(bizDoc.id);
            setCustomer({ ...s.docs[0].data(), id: s.docs[0].id });
            break;
          }
        }
      } finally {
        setIsIdentityLoading(false);
      }
    }
    resolve();
  }, [user, isUserLoading, firestore]);

  const installationsQuery = useMemoFirebase(() => 
    businessId && customer?.id ? query(collection(firestore, 'businesses', businessId, 'solarInstallations'), where('customerId', '==', customer.id)) : null
  , [firestore, businessId, customer?.id]);
  const { data: installations = [] } = useCollection<any>(installationsQuery);

  const [formData, setFormData] = useState({
    installationId: "",
    category: "GENERAL_SERVICE",
    description: "",
    priority: "medium",
    requestSource: "Customer Portal"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !customer || !formData.installationId) {
      toast({ variant: "destructive", title: "Missing Data", description: "Please select your system node." });
      return;
    }

    setIsSubmitting(true);
    try {
      const serviceRef = collection(firestore, 'businesses', businessId, 'solarServiceRequests');
      const install = installations.find(i => i.id === formData.installationId);
      
      const docRef = await addDocumentNonBlocking(serviceRef, {
        ...formData,
        businessId,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        warrantyId: install?.activeWarrantyId || null,
        status: 'OPEN',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Notify Business Admin
      const bizSnap = await getDoc(doc(firestore, 'businesses', businessId));
      const bizData = bizSnap.data();
      if (bizData?.ownerId) {
        addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'notifications'), {
          businessId,
          recipientId: bizData.ownerId,
          title: "New Customer Service Request",
          message: `${customer.name} raised a ticket for ${formData.category}`,
          type: 'service',
          isRead: false,
          createdAt: serverTimestamp()
        });
      }

      setIsSuccess(true);
      toast({ title: "Ticket Established" });
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Error", description: "Submission failed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isIdentityLoading) return <div className="min-h-screen flex items-center justify-center opacity-40"><Loader2 className="animate-spin text-primary" /></div>;

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-500">
        <div className="max-w-md w-full space-y-8 text-center">
           <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center mx-auto border-4 border-white shadow-xl shadow-green-200/50">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
           </div>
           <div className="space-y-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Request Received!</h1>
              <p className="text-muted-foreground font-medium">A support node has been established. Our technical team will review and schedule a visit shortly.</p>
           </div>
           <Button asChild className="w-full h-16 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">
              <Link href={`/portal/solar?bId=${businessId}`}>Return to Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
           </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-left">
      <header className="bg-white border-b h-16 sm:h-20 flex items-center sticky top-0 z-50 shadow-sm px-4">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between text-left">
          <div className="flex items-center gap-4">
             <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0"><Link href={`/portal/solar?bId=${businessId}`}><ArrowLeft className="h-5 w-5" /></Link></Button>
             <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Open Service Ticket</h1>
          </div>
          <Badge variant="outline" className="h-6 px-3 border-green-200 bg-green-50 text-green-600 text-[9px] font-black uppercase tracking-widest rounded-full">Secure Node</Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-12 space-y-12">
        <div className="text-center space-y-4">
           <div className="h-20 w-20 rounded-[2.5rem] bg-white flex items-center justify-center mx-auto shadow-2xl border border-border/10">
              <Wrench className="h-10 w-10 text-primary" />
           </div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight uppercase">Technical Support</h2>
           <p className="text-muted-foreground text-sm font-medium leading-relaxed max-w-sm mx-auto">Please describe the concern sateek (precise) tarike se, aur hamari team turant action legi.</p>
        </div>

        <form onSubmit={handleSubmit} className="px-1">
          <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden border">
            <CardHeader className="p-8 sm:p-12 pb-0">
               <div className="flex items-center gap-4 mb-8">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-inner">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-[0.2em] text-slate-900 leading-none">Ticket Identity</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2 tracking-widest opacity-60">System & Issue Details</p>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-8 sm:p-12 space-y-10">
               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.2em]">Select Your Solar System *</Label>
                  <Select value={formData.installationId} onValueChange={(v) => setFormData({...formData, installationId: v})}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none shadow-inner font-black uppercase text-xs">
                      <SelectValue placeholder="Choose Installation Node..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      {installations.map(inst => (
                        <SelectItem key={inst.id} value={inst.id} className="text-[10px] font-bold uppercase">{inst.installationNumber} - {inst.capacityKw}kW</SelectItem>
                      ))}
                      {installations.length === 0 && <SelectItem value="none" disabled>No active systems found</SelectItem>}
                    </SelectContent>
                  </Select>
               </div>

               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.2em]">Issue Category *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none shadow-inner font-black uppercase text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="text-[10px] font-bold uppercase">{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
               </div>

               <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.2em]">Describe the concern in detail *</Label>
                 <Textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Type everything here... (e.g. Inverter display red light, Panel cleaning required)" className="min-h-[150px] rounded-[2rem] bg-slate-50 border-none shadow-inner p-6 text-sm font-medium leading-relaxed" />
               </div>
            </CardContent>
            <CardFooter className="p-8 sm:p-12 pt-0">
               <Button type="submit" disabled={isSubmitting || !formData.installationId} className="w-full h-16 sm:h-20 bg-primary hover:bg-primary/90 text-white font-black uppercase text-sm sm:text-base tracking-[0.3em] rounded-[2rem] shadow-2xl active:scale-95 transition-all">
                 {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Send className="mr-4 h-6 w-6" /> Deploy Support Request</>}
               </Button>
            </CardFooter>
          </Card>
        </form>

        <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 flex items-start gap-4 mx-1">
           <Info className="h-6 w-6 text-primary shrink-0 mt-0.5" />
           <div className="space-y-1 text-left">
              <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">Response Protocol</p>
              <p className="text-[11px] text-blue-700/70 leading-relaxed font-medium italic mt-2 uppercase tracking-tighter">
                "Our technical team typically responds within 24 business hours. You can track the real-time status of this ticket from your portal dashboard."
              </p>
           </div>
        </div>
      </main>
    </div>
  );
}