
"use client";

import { use, useState, useEffect } from "react";
import { 
  MessageSquare, 
  Star, 
  Send, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  Building2, 
  Info,
  ArrowRight,
  Sparkles,
  SmartphoneNfc,
  Calendar,
  AlertCircle,
  Smartphone,
  Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking, useAuth, setupRecaptcha, initiatePhoneSignIn } from "@/firebase";
import { doc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ConfirmationResult } from "firebase/auth";

/**
 * Utility component to render text with word highlighting
 * Supports Solid Colors and Linear Gradients
 */
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
  
  const parts = text.split(new RegExp( `(${highlight})`, 'gi'));
  
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

export default function PublicFeedbackPage(props: { params: Promise<{ businessId: string }> }) {
  const { businessId } = use(props.params);
  const firestore = useFirestore();
  const auth = useAuth();

  // 1. Fetch Business Profile
  const bizRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business, isLoading: isBizLoading } = useDoc<any>(bizRef);

  // 2. Fetch Form Config
  const configRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId, 'feedbackConfig', 'main') : null, [firestore, businessId]);
  const { data: formConfig, isLoading: isConfigLoading } = useDoc<any>(configRef);

  const [formData, setFormData] = useState<any>({
    customerName: "",
    customerContact: "",
    rating: 5, 
    category: "General",
    data: {}
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submissionId, setSubmissionId] = useState("");

  // Verification States
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'sending' | 'sent' | 'verified'>('idle');
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Functional update for defaults initialization to prevent infinite loop
  useEffect(() => {
    if (formConfig?.fields) {
      setFormData((prev: any) => {
        let changed = false;
        const newData = { ...prev.data };
        
        formConfig.fields.forEach((field: any) => {
          if (field.type === 'rating' && newData[field.label] === undefined) {
            newData[field.label] = 5; 
            changed = true;
          }
        });

        if (!changed) return prev;
        return { ...prev, data: newData };
      });
    }
  }, [formConfig?.fields]);

  const handleRatingClick = (val: number) => {
    setFormData((prev: any) => {
      const currentRating = prev.rating;
      const targetHalf = val - 0.5;
      const targetFull = val;
      return {
        ...prev,
        rating: currentRating === targetHalf ? targetFull : targetHalf
      };
    });
  };

  const updateDynamicData = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      data: { ...prev.data, [key]: value }
    }));
  };

  const handleDynamicRatingClick = (key: string, val: number) => {
    setFormData((prev: any) => {
      const currentVal = prev.data[key] || 0;
      const targetHalf = val - 0.5;
      const targetFull = val;
      return {
        ...prev,
        data: {
          ...prev.data,
          [key]: currentVal === targetHalf ? targetFull : targetHalf
        }
      };
    });
  };

  const updateCheckboxGroup = (key: string, option: string, checked: boolean) => {
    setFormData((prev: any) => {
      const current = prev.data[key] || [];
      const updated = checked ? [...current, option] : current.filter((o: string) => o !== option);
      return {
        ...prev,
        data: { ...prev.data, [key]: updated }
      };
    });
  };

  const handleSendOtp = async () => {
    if (!formData.customerContact || formData.customerContact.length < 10) {
      toast({ variant: "destructive", title: "Invalid Number", description: "Please enter a valid mobile number." });
      return;
    }
    setVerificationStatus('sending');
    try {
      const verifier = setupRecaptcha(auth, 'recaptcha-container');
      const phone = formData.customerContact.startsWith('+') ? formData.customerContact : `+91${formData.customerContact}`;
      const result = await initiatePhoneSignIn(auth, phone, verifier);
      setConfirmationResult(result);
      setVerificationStatus('sent');
      toast({ title: "OTP Sent", description: "Verification code sent to your mobile." });
    } catch (e: any) {
    console.error(e);
      setVerificationStatus('idle');
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to send OTP." });
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmationResult) return;
    try {
      await confirmationResult.confirm(otp);
      setVerificationStatus('verified');
      toast({ title: "Verified", description: "Mobile number verified successfully." });
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Invalid OTP", description: "Please check the code and try again." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    // Check if OTP is required but not verified
    if (formConfig?.isOtpEnabled && verificationStatus !== 'verified') {
      toast({ variant: "destructive", title: "Verification Required", description: "Please verify your mobile number to submit feedback." });
      return;
    }

    setIsSubmitting(true);
    try {
      const feedbackRef = collection(firestore, 'businesses', businessId, 'feedback');
      const docRef = await addDocumentNonBlocking(feedbackRef, {
        ...formData,
        businessId,
        status: 'new',
        replies: [],
        createdAt: serverTimestamp(),
        isVerified: verificationStatus === 'verified'
      });
      if (business?.ownerId) {
        addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'notifications'), {
          businessId,
          recipientId: business.ownerId,
          title: "New Feedback Received",
          message: `${formData.customerName} submitted feedback for ${formData.category}`,
          type: 'message',
          isRead: false,
          createdAt: serverTimestamp()
        });
      }
      setSubmissionId(docRef?.id || "");
      setIsSuccess(true);
      toast({ title: "Feedback Received", description: "Thank you for your valuable input!" });
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Error", description: "Could not submit. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isBizLoading || isConfigLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>;

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
        <div className="max-w-md w-full space-y-6 sm:space-y-8 animate-in zoom-in-95 duration-500">
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto border-4 border-white shadow-xl shadow-green-200/50">
            <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Feedback Registered!</h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium leading-relaxed px-4">
              Namaste {formData.customerName}, your feedback has been synchronized with the team at <strong>{business?.name}</strong>.
            </p>
          </div>
          <Card className="border-none shadow-xl bg-white rounded-2xl sm:rounded-3xl overflow-hidden p-6 border-2 border-green-50 mx-4">
            <p className="text-[10px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Secure Track Code</p>
            <p className="text-xl sm:text-2xl font-mono font-black text-primary tracking-tighter">{submissionId.slice(-8).toUpperCase()}</p>
            <Separator className="my-4 sm:my-6" />
            <Button asChild className="w-full h-12 sm:h-14 bg-primary font-black uppercase text-[10px] sm:text-xs tracking-widest rounded-xl sm:rounded-2xl shadow-lg">
              <Link href={`/feedback/track/${businessId}/${submissionId}`}>Track Progress & Replies <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </Card>
          <p className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 tracking-widest">Powered by Biztrix AI OS</p>
        </div>
      </div>
    );
  }

  // Styles for dynamic typography
  const titleFont = formConfig?.titleFont || 'Mukta';
  const descFont = formConfig?.descriptionFont || 'Mukta';
  const titleSize = formConfig?.titleFontSize ? `${formConfig.titleFontSize}px` : undefined;
  const descSize = formConfig?.descriptionFontSize ? `${formConfig.descriptionFontSize}px` : undefined;

  const fontsToLoad = Array.from(new Set([titleFont, descFont]));
  const fontUrl = `https://fonts.googleapis.com/css2?${fontsToLoad.map(f => `family=${f.replace(' ', '+')}:wght@400;700;900`).join('&')}&display=swap`;

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-20 overflow-x-hidden">
      <link rel="stylesheet" href={fontUrl} />
      <div id="recaptcha-container"></div>
      <header className="bg-white border-b h-16 sm:h-20 flex items-center sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-border/10 shrink-0 overflow-hidden">
                {formConfig?.logoUrl ? (
                  <img src={formConfig.logoUrl} className="h-full w-full object-cover" alt="Logo" />
                ) : (
                  <div className="h-full w-full bg-primary flex items-center justify-center text-white font-black text-sm sm:text-base">
                    {business?.name?.charAt(0) || "B"}
                  </div>
                )}
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-black text-slate-900 block leading-none truncate">{business?.name}</span>
                <span className="text-[8px] sm:text-[9px] font-bold text-green-600 uppercase tracking-tighter mt-1.5 block">
                   Official Submission Node
                </span>
            </div>
          </div>
          <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary opacity-20" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 space-y-12 sm:space-y-20">
        <div className="text-center space-y-10 sm:space-y-16">
           <div className="flex flex-col items-center gap-8 sm:gap-10">
             <div className="relative group">
                <div className="absolute inset-0 bg-primary/10 blur-[40px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="relative h-20 w-20 sm:h-28 sm:w-28 bg-white rounded-3xl flex items-center justify-center shadow-2xl border border-border/10 overflow-hidden transition-transform group-hover:scale-105 duration-500">
                  {formConfig?.logoUrl ? (
                    <img src={formConfig.logoUrl} className="h-full w-full object-cover" alt="Hero Logo" />
                  ) : (
                    <div className="h-full w-full bg-primary flex items-center justify-center text-white font-black text-2xl sm:text-4xl">
                      {business?.name?.charAt(0) || "B"}
                    </div>
                  )}
                </div>
             </div>

             <Badge variant="outline" className="h-6 sm:h-7 px-3 sm:px-4 border-primary/20 bg-primary/5 text-primary text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] animate-fade-in">
               <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-2 fill-current" /> We Value Your Voice
             </Badge>
           </div>

           <div className="space-y-6 sm:space-y-8 px-2">
             <h1 
               className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] sm:leading-[1.1] max-w-4xl mx-auto" 
               style={{ fontFamily: titleFont, fontSize: titleSize }}
             >
               <HighlightedText 
                  text={formConfig?.title || "Share Your Experience"} 
                  highlight={formConfig?.titleHighlightWord} 
                  color={formConfig?.titleHighlightColor}
                  isGradient={formConfig?.titleHighlightGradient}
                  gradientEnd={formConfig?.titleGradientEnd}
               />
             </h1>
             <p 
               className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto font-medium leading-relaxed px-4 opacity-80" 
               style={{ fontFamily: descFont, fontSize: descSize }}
             >
               <HighlightedText 
                  text={formConfig?.description || "Your feedback helps us innovate and provide better service to the community."} 
                  highlight={formConfig?.descriptionHighlightWord} 
                  color={formConfig?.descriptionHighlightColor}
                  isGradient={formConfig?.descriptionHighlightGradient}
                  gradientEnd={formConfig?.descriptionGradientEnd}
               />
             </p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="px-1 max-w-4xl mx-auto">
          <Card className="border-none shadow-2xl bg-white rounded-[2rem] sm:rounded-[3rem] overflow-hidden border-border/50">
            <CardHeader className="p-4 sm:p-8 pb-0">
               <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-5 sm:p-8 bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5"><Star className="h-40 w-40" /></div>
                  <div className="text-center sm:text-left relative z-10">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-1 sm:mb-2">Overall Experience</p>
                    <h3 className="text-base sm:text-xl font-bold tracking-tight">How would you rate us?</h3>
                    <p className="text-[7px] sm:text-[8px] text-slate-400 font-bold mt-1 uppercase tracking-widest">1 Click = 0.5 | 2 Clicks = 1.0</p>
                  </div>
                  <div className="flex flex-row items-center gap-4 sm:gap-6 relative z-10 shrink-0">
                    <div className="flex flex-row justify-center gap-1 sm:gap-1.5 flex-nowrap">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button 
                          key={i} 
                          type="button" 
                          onClick={() => handleRatingClick(i)}
                          className={cn(
                            "h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-all border-2 relative overflow-hidden active:scale-95 shadow-sm shrink-0",
                            formData.rating >= i - 0.5 ? "border-yellow-400 bg-yellow-400/10" : "bg-white/5 border-white/10"
                          )}
                        >
                          <div className="relative h-4 w-4 sm:h-5 sm:w-5">
                            <Star className="absolute inset-0 h-full w-full text-white/20" />
                            {formData.rating >= i - 0.5 && (
                              <Star 
                                className="absolute inset-0 h-full w-full fill-yellow-400 text-yellow-400 transition-all duration-300"
                                style={{ 
                                  clipPath: formData.rating === i - 0.5 ? 'polygon(0 0, 50% 0, 50% 100%, 0% 100%)' : 'none' 
                                }}
                              />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-yellow-400 flex items-center justify-center font-black text-slate-900 text-xs sm:text-base border-2 border-white shadow-xl shrink-0">
                      {formData.rating}
                    </div>
                  </div>
                  {formData.rating <= 3.5 && (
                    <div className="w-full mt-6 animate-in fade-in slide-in-from-top-2 duration-300 relative z-10 col-span-full">
                      <Label className="text-[10px] font-black uppercase text-accent mb-3 block tracking-widest text-center sm:text-left">Please tell us why you gave this rating so we can improve.</Label>
                      <Textarea 
                        placeholder="Detail se likhiye..."
                        value={formData.overallReason || ""}
                        onChange={(e) => setFormData((prev: any) => ({...prev, overallReason: e.target.value}))}
                        className="min-h-[100px] rounded-2xl bg-white/5 border-white/10 text-white p-5 text-sm font-medium placeholder:text-white/20 focus-visible:ring-accent"
                      />
                    </div>
                  )}
               </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-12 space-y-10 sm:space-y-16">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
                 <div className="space-y-3">
                   <Label className="text-[10px] sm:text-[11px] font-black uppercase text-slate-500 ml-1 tracking-[0.15em]">Your Full Name *</Label>
                   <Input required value={formData.customerName} onChange={(e) => setFormData((prev: any) => ({...prev, customerName: e.target.value}))} className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-50 border-border/50 shadow-inner font-bold text-base" />
                 </div>
                 <div className="space-y-3">
                   <Label className="text-[10px] sm:text-[11px] font-black uppercase text-slate-500 ml-1 tracking-[0.15em]">Mobile Number *</Label>
                   <div className="flex gap-2 sm:gap-3">
                      <div className="relative flex-1">
                         <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 opacity-40" />
                         <Input 
                            required 
                            disabled={verificationStatus === 'verified'}
                            value={formData.customerContact} 
                            onChange={(e) => setFormData((prev: any) => ({...prev, customerContact: e.target.value.replace(/\D/g, '')}))} 
                            className="h-12 sm:h-14 pl-12 rounded-xl sm:rounded-2xl bg-slate-50 border-border/50 shadow-inner font-bold text-base" 
                         />
                      </div>
                      {formConfig?.isOtpEnabled && verificationStatus !== 'verified' && (
                        <Button 
                          type="button"
                          onClick={handleSendOtp}
                          disabled={verificationStatus === 'sending'}
                          className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-primary text-white font-black text-[10px] sm:text-xs uppercase tracking-widest px-6 shadow-lg"
                        >
                          {verificationStatus === 'sending' ? <Loader2 className="animate-spin h-4 w-4" /> : "Verify"}
                        </Button>
                      )}
                      {verificationStatus === 'verified' && (
                        <div className="h-12 sm:h-14 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-green-50 flex items-center gap-2 border border-green-100 text-green-600 font-black text-[10px] sm:text-xs uppercase">
                          <CheckCircle2 className="h-5 w-5" /> Verified
                        </div>
                      )}
                   </div>

                   {verificationStatus === 'sent' && (
                     <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-border animate-in slide-in-from-top-4 duration-300">
                        <Label className="text-[9px] font-black uppercase text-slate-400 mb-3 block text-center tracking-widest">Enter 6-digit Code</Label>
                        <div className="flex gap-3">
                          <Input 
                            placeholder="000000" 
                            value={otp} 
                            onChange={(e) => setOtp(e.target.value)} 
                            className="h-12 sm:h-14 rounded-xl text-center tracking-[0.5em] font-black text-xl flex-1 bg-white" 
                          />
                          <Button 
                            type="button"
                            onClick={handleVerifyOtp}
                            className="bg-green-600 hover:bg-green-700 text-white rounded-xl sm:rounded-2xl px-8 font-black uppercase text-[10px] sm:text-xs tracking-widest"
                          >
                            Verify
                          </Button>
                        </div>
                     </div>
                   )}
                 </div>
              </div>
              
              <div className="grid grid-cols-1 gap-12 sm:gap-16">
                {formConfig?.fields?.map((field: any) => (
                  <div key={field.id} className="space-y-4">
                    {field.type !== 'paragraph' && (
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] sm:text-[11px] font-black uppercase text-slate-500 ml-1 tracking-[0.15em]">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </Label>
                        {field.type === 'rating' && (formData.data[field.label] || 0) > 0 && (
                          <Badge className="bg-yellow-400 text-slate-900 border-none font-black text-[10px] px-2 h-5">{formData.data[field.label]} / 5</Badge>
                        )}
                      </div>
                    )}
                    {field.type === 'text' && <Input required={field.required} onChange={(e) => updateDynamicData(field.label, e.target.value)} className="h-12 sm:h-14 rounded-xl border-border bg-white shadow-sm font-bold text-base" />}
                    {field.type === 'textarea' && <Textarea required={field.required} onChange={(e) => updateDynamicData(field.label, e.target.value)} placeholder="Detail se likhiye..." className="min-h-[120px] rounded-2xl border-border bg-white shadow-sm p-5 font-medium text-sm" />}
                    {field.type === 'paragraph' && <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium bg-primary/5 p-6 rounded-2xl border-l-8 border-primary">{field.label}</p>}
                    {field.type === 'date' && (
                      <div className="relative w-full max-w-full">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 opacity-40 z-10" />
                        <Input 
                          type="date" 
                          required={field.required} 
                          onChange={(e) => updateDynamicData(field.label, e.target.value)} 
                          className="h-12 sm:h-14 pl-12 pr-4 rounded-xl border-border bg-white shadow-sm font-bold w-full" 
                        />
                      </div>
                    )}
                    {field.type === 'checkbox' && (
                      <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-primary/20 transition-all cursor-pointer">
                        <Checkbox 
                          id={field.id} 
                          checked={!!formData.data[field.label]} 
                          onCheckedChange={(checked) => updateDynamicData(field.label, !!checked)} 
                        />
                        <Label htmlFor={field.id} className="text-sm sm:text-base font-bold cursor-pointer flex-1 text-slate-700">{field.label}</Label>
                      </div>
                    )}
                    {field.type === 'checkbox-group' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        {(field.options || "").split(',').map((opt: string) => {
                          const optionValue = opt.trim();
                          const isChecked = (formData.data[field.label] || []).includes(optionValue);
                          return (
                            <div key={optionValue} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-border/50 hover:bg-white transition-all shadow-sm">
                              <Checkbox 
                                id={`${field.id}_${optionValue}`} 
                                checked={isChecked} 
                                onCheckedChange={(checked) => updateCheckboxGroup(field.label, optionValue, !!checked)} 
                              />
                              <Label htmlFor={`${field.id}_${optionValue}`} className="text-xs sm:text-sm font-black text-slate-700 cursor-pointer flex-1">{optionValue}</Label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {field.type === 'select' && <Select required={field.required} onValueChange={(v) => updateDynamicData(field.label, v)}><SelectTrigger className="h-12 sm:h-14 rounded-xl border-border bg-white shadow-sm font-black text-sm uppercase"><SelectValue placeholder="Pick an option..." /></SelectTrigger><SelectContent className="rounded-2xl border-none shadow-2xl">{(field.options || "").split(',').map((opt: string) => <SelectItem key={opt.trim()} value={opt.trim()} className="font-bold text-xs uppercase">{opt.trim()}</SelectItem>)}</SelectContent></Select>}
                    {field.type === 'rating' && (
                      <div className="flex flex-col gap-4 pt-1">
                        <div className="flex flex-row items-center gap-4 sm:gap-6 p-4 sm:p-5 bg-slate-50 rounded-[2rem] border-2 border-yellow-400/10 shadow-inner justify-center sm:justify-start">
                          <div className="flex flex-row justify-center gap-1 sm:gap-1.5 flex-nowrap">
                            {[1, 2, 3, 4, 5].map(v => (
                               <button key={v} type="button" onClick={() => handleDynamicRatingClick(field.label, v)} className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl flex items-center justify-center border-2 transition-all relative overflow-hidden active:scale-90 shrink-0", (formData.data[field.label] || 0) >= v - 0.5 ? "border-yellow-400 bg-yellow-400/10" : "bg-white border-muted shadow-sm")}>
                                  <div className="relative h-3.5 w-3.5 sm:h-4 sm:w-4">
                                    <Star className="absolute inset-0 h-full w-full text-muted border-muted" />
                                    {(formData.data[field.label] || 0) >= v - 0.5 && (
                                      <Star className="absolute inset-0 h-full w-full fill-yellow-400 text-yellow-400 transition-all duration-300" style={{ clipPath: formData.data[field.label] === v - 0.5 ? 'polygon(0 0, 50% 0, 50% 100%, 0% 100%)' : 'none' }} />
                                    )}
                                  </div>
                               </button>
                            ))}
                          </div>
                          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-yellow-400 text-slate-900 flex items-center justify-center font-black text-xs sm:text-base border-2 border-white shadow-lg shrink-0">
                            {formData.data[field.label] || 0}
                          </div>
                        </div>
                        {(formData.data[field.label] || 0) <= 3.5 && (formData.data[field.label] || 0) > 0 && (
                          <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300 p-6 bg-orange-50 rounded-2xl border border-orange-100 flex flex-col gap-4">
                            <div className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-orange-600" /><Label className="text-[11px] font-black uppercase text-orange-800 tracking-widest leading-relaxed">Aapka anubhav kaisa raha? Hum ise kaise behtar bana sakte hain?</Label></div>
                            <Textarea placeholder="Sujaav ya shikayat yahan likhein..." onChange={(e) => updateDynamicData(field.label + '_reason', e.target.value)} className="min-h-[100px] rounded-xl bg-white border-orange-200 text-sm font-medium" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="p-6 sm:p-12 pt-0">
               <Button 
                  type="submit" 
                  disabled={isSubmitting || (formConfig?.isOtpEnabled && verificationStatus !== 'verified')} 
                  className="w-full h-16 sm:h-20 bg-primary hover:bg-primary/90 text-white font-black uppercase text-sm sm:text-base tracking-[0.2em] rounded-2xl sm:rounded-[2rem] shadow-2xl active:scale-95 transition-all"
               >
                  {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Send className="mr-4 h-6 w-6" /> Submit Experience</>}
               </Button>
            </CardFooter>
          </Card>
        </form>
        
        <div className="max-w-4xl mx-auto px-1">
          <div className="p-8 sm:p-12 bg-blue-50 rounded-[2.5rem] sm:rounded-[3.5rem] border border-blue-100 flex flex-col sm:flex-row items-center gap-8 sm:gap-10">
             <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl sm:rounded-[1.5rem] bg-white border border-blue-100 flex items-center justify-center text-primary shadow-xl shrink-0"><Info className="h-7 w-7 sm:h-8 sm:w-8" /></div>
             <div className="flex-1 text-center sm:text-left space-y-2">
                <p className="text-[11px] sm:text-xs font-black uppercase text-primary tracking-[0.2em]">Response Protocol</p>
                <p className="text-sm sm:text-base text-blue-700 font-medium leading-relaxed">Our team typically responds to feedback within 24 business hours. You will be able to track our response using a secure link after submission.</p>
             </div>
          </div>
        </div>
      </main>
      
      <footer className="mt-24 sm:mt-32 py-12 sm:py-16 border-t bg-white text-center">
         <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-6 w-6 sm:h-8 sm:w-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[10px] sm:text-xs font-black">B</div>
            <span className="text-[10px] sm:text-[12px] font-black uppercase tracking-[0.3em] text-slate-900">Biztrix Secure Operating System</span>
         </div>
         <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest px-4">Digital Trust • Multi-tenant Encrypted Node • Verified v2.5</p>
      </footer>
    </div>
  );
}
