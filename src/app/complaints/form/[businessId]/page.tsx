
"use client";

import { use, useState, useRef } from "react";
import { 
  Headset, 
  Send, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  Zap, 
  MessageSquare, 
  Smartphone, 
  User, 
  Building2, 
  Info,
  ArrowRight,
  Sparkles,
  SmartphoneNfc,
  ImageIcon,
  X,
  MapPin,
  Upload
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
import { useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking } from "@/firebase";
import { doc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function PublicComplaintForm(props: { params: Promise<{ businessId: string }> }) {
  const { businessId } = use(props.params);
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bizRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business, isLoading: isBizLoading } = useDoc<any>(bizRef);

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    subject: "",
    description: "",
    category: "Service",
    priority: "medium",
    branchLocation: "Main",
    mediaUrls: [] as string[]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [docId, setDocId] = useState("");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({
            ...prev,
            mediaUrls: [...(prev.mediaUrls || []), reader.result as string]
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    setIsSubmitting(true);
    try {
      const generatedTicketId = `T-${Math.floor(1000 + Math.random() * 9000)}`;
      const complaintsRef = collection(firestore, 'businesses', businessId, 'complaints');
      
      const docRef = await addDocumentNonBlocking(complaintsRef, {
        ...formData,
        ticketId: generatedTicketId,
        businessId,
        status: 'new',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (business?.ownerId) {
        addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'notifications'), {
          businessId,
          recipientId: business.ownerId,
          title: "New Support Ticket",
          message: `${formData.customerName} filed a complaint: ${formData.subject}`,
          type: 'message',
          isRead: false,
          createdAt: serverTimestamp()
        });
      }

      setTicketId(generatedTicketId);
      if (docRef) setDocId(docRef.id);
      setIsSuccess(true);
      toast({ title: "Ticket Established", description: "The team has been notified." });
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Transmission Error", description: "Please check connection and try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isBizLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>;

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-500">
        <div className="max-w-md w-full space-y-8">
           <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto border-4 border-white shadow-xl shadow-green-200/50">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
           </div>
           <div className="space-y-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Ticket Registered!</h1>
              <p className="text-muted-foreground font-medium">Namaste {formData.customerName}, your support request has been synchronized with <strong>{business?.name}</strong>.</p>
           </div>
           <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] p-8 space-y-6 border-2 border-green-50">
              <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tracking Identity</p>
                 <p className="text-2xl font-mono font-black text-primary tracking-widest">{ticketId}</p>
              </div>
              <Separator />
              <Button asChild className="w-full h-16 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">
                 <Link href={`/complaints/track/${businessId}/${docId}`}>Track Live Status <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
           </Card>
           <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Official Support Node • Biztrix AI</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-20 overflow-x-hidden text-left">
      <header className="bg-white border-b h-16 sm:h-20 flex items-center sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-border/10 shrink-0 overflow-hidden">
               {business?.logoUrl ? <img src={business.logoUrl} className="h-full w-full object-contain p-1" alt="" /> : <div className="h-full w-full bg-primary flex items-center justify-center text-white font-black">{business?.name?.charAt(0)}</div>}
            </div>
            <div className="flex flex-col min-w-0">
               <span className="text-sm sm:text-base font-black text-slate-900 truncate">{business?.name}</span>
               <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Resolution Center</span>
            </div>
          </div>
          <ShieldCheck className="h-5 w-5 text-primary opacity-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-12 space-y-12 sm:space-y-20">
        <div className="text-center space-y-10">
           <div className="flex flex-col items-center gap-6">
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 bg-white rounded-[2rem] flex items-center justify-center shadow-2xl border border-border/10 overflow-hidden">
                <Headset className="h-10 w-10 text-primary" />
              </div>
              <Badge variant="outline" className="h-7 px-4 border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-full">Secure Support Node</Badge>
           </div>
           <div className="space-y-4">
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">We're Here to <span className="text-primary underline decoration-primary/20 underline-offset-8">Solve.</span></h1>
              <p className="text-muted-foreground font-medium leading-relaxed max-w-xl mx-auto text-sm sm:text-lg opacity-80">Share your concern sateek (precise) tarike se, aur hamari team turant action legi.</p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="px-1">
          <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden border">
            <CardHeader className="p-8 sm:p-12 pb-0">
               <div className="flex items-center gap-4 mb-8">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-inner">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-[0.3em] text-slate-900 leading-none">Issue Node</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2 tracking-widest opacity-60">Identity & Problem Details</p>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-8 sm:p-12 space-y-10">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.2em]">Full Name *</Label>
                    <Input required value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none shadow-inner font-bold text-lg" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.2em]">Mobile Node *</Label>
                    <div className="relative">
                       <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 opacity-40" />
                       <Input required value={formData.customerPhone} onChange={(e) => setFormData({...formData, customerPhone: e.target.value.replace(/\D/g, '')})} placeholder="91XXXXXXXX" className="h-14 pl-12 rounded-2xl bg-slate-50 border-none shadow-inner font-bold text-lg" />
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.2em]">Problem Subject *</Label>
                    <Input required value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} placeholder="e.g. Delayed Delivery / Billing Issue" className="h-14 rounded-2xl bg-slate-50 border-none shadow-inner font-bold" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.2em]">Department Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                       <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none shadow-inner font-black uppercase text-xs"><SelectValue /></SelectTrigger>
                       <SelectContent className="rounded-xl border-none shadow-2xl">
                          <SelectItem value="Service" className="text-xs font-bold uppercase">Technical Service</SelectItem>
                          <SelectItem value="Product" className="text-xs font-bold uppercase">Product Quality</SelectItem>
                          <SelectItem value="Billing" className="text-xs font-bold uppercase">Billing & Payments</SelectItem>
                          <SelectItem value="Logistics" className="text-xs font-bold uppercase">Logistics & Delivery</SelectItem>
                       </SelectContent>
                    </Select>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.2em]">Target Branch</Label>
                    <Select value={formData.branchLocation} onValueChange={(v) => setFormData({...formData, branchLocation: v})}>
                       <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none shadow-inner font-black uppercase text-xs"><SelectValue /></SelectTrigger>
                       <SelectContent className="rounded-xl border-none shadow-2xl">
                          <SelectItem value="Main" className="text-xs font-bold uppercase">Main Hub</SelectItem>
                          {(business?.branchLocations || []).map((b: string) => <SelectItem key={b} value={b} className="text-xs font-bold uppercase">{b}</SelectItem>)}
                       </SelectContent>
                    </Select>
                  </div>
               </div>

               <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.2em]">Describe the concern in detail *</Label>
                 <Textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Type everything here..." className="min-h-[150px] rounded-[2rem] bg-slate-50 border-none shadow-inner p-6 text-sm font-medium leading-relaxed" />
               </div>

               <div className="space-y-6">
                  <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.2em]">Photos / Evidence</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                     {formData.mediaUrls.map((url, i) => (
                       <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border group">
                         <img src={url} className="w-full h-full object-cover" alt="" />
                         <button type="button" onClick={() => setFormData(prev => ({ ...prev, mediaUrls: prev.mediaUrls.filter((_, idx) => idx !== i) }))} className="absolute top-2 right-2 bg-white/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3 text-red-500" /></button>
                       </div>
                     ))}
                     <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-2 hover:bg-primary/10 transition-all">
                       <Upload className="h-6 w-6 text-primary" />
                       <span className="text-[8px] font-black uppercase text-primary/60">Upload</span>
                     </button>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
               </div>
            </CardContent>
            <CardFooter className="p-8 sm:p-12 pt-0">
               <Button type="submit" disabled={isSubmitting} className="w-full h-20 bg-primary hover:bg-primary/90 text-white font-black uppercase text-sm sm:text-base tracking-[0.3em] rounded-[2rem] shadow-2xl active:scale-95 transition-all">
                 {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Send className="mr-4 h-6 w-6" /> Deploy Support Request</>}
               </Button>
            </CardFooter>
          </Card>
        </form>
      </main>
    </div>
  );
}
