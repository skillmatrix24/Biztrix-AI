"use client";

import { use, useState, useMemo, useEffect, Suspense } from "react";
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  Loader2, 
  Search, 
  User, 
  Zap, 
  Sun,
  ClipboardCheck,
  SearchCode,
  ChevronRight,
  Info,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp, query, where, getDocs, limit, getDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SurveyForm } from "../../components/SurveyForm";
import { createSolarNotification } from "@/firebase/solar-notifications";

function NewSurveyContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const incomingInquiryId = searchParams.get('inquiryId');

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const [inquiry, setInquiry] = useState<any>(null);
  const [isInquiryLoading, setIsInquiryLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingSurveyCount, setExistingSurveyCount] = useState(0);

  // Fetch Team
  const teamQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'users'), where('businessId', '==', businessId)) : null
  , [firestore, businessId]);
  const { data: teamMembers = [] } = useCollection<any>(teamQuery);

  useEffect(() => {
    async function loadInquiry() {
      if (!incomingInquiryId || !businessId) return;
      setIsInquiryLoading(true);
      try {
        const docRef = doc(firestore, 'businesses', businessId, 'solarInquiries', incomingInquiryId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setInquiry({ ...snap.data(), id: snap.id });
          
          // Check for existing surveys to prevent duplicates
          const sQuery = query(collection(firestore, 'businesses', businessId, 'solarSurveys'), where('inquiryId', '==', incomingInquiryId));
          const sSnap = await getDocs(sQuery);
          setExistingSurveyCount(sSnap.size);
        }
      } finally {
        setIsInquiryLoading(false);
      }
    }
    loadInquiry();
  }, [incomingInquiryId, businessId, firestore]);

  const handleSubmit = async (data: any) => {
    if (!businessId || !inquiry || !user) return;
    
    // Double-check prevention
    if (existingSurveyCount > 0) {
      toast({ variant: "destructive", title: "Duplicate Prevented", description: "A technical audit node already exists for this inquiry." });
      return;
    }

    setIsSubmitting(true);
    try {
      const surveysRef = collection(firestore, 'businesses', businessId, 'solarSurveys');
      const docRef = await addDocumentNonBlocking(surveysRef, {
        ...data,
        businessId,
        inquiryId: inquiry.id,
        customerId: inquiry.customerId,
        leadId: inquiry.leadId || null,
        customerName: inquiry.customerName,
        customerPhone: inquiry.customerPhone,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update Inquiry Status
      const inqRef = doc(firestore, 'businesses', businessId, 'solarInquiries', inquiry.id);
      updateDocumentNonBlocking(inqRef, { status: 'SITE_SURVEY_PENDING', updatedAt: serverTimestamp() });

      // NOTIFICATION: Trigger Survey Scheduled for Assigned Specialist
      if (data.assignedTo && docRef) {
        createSolarNotification(firestore, {
          businessId,
          recipientId: data.assignedTo,
          title: "New Survey Assigned",
          message: `Technical audit scheduled for ${inquiry.customerName} on ${data.surveyDate}.`,
          type: 'solar_alert',
          severity: 'INFO',
          entityType: 'SOLAR_SURVEY',
          entityId: docRef.id
        });
      }

      toast({ title: "Survey Node Established", description: "Identity audit linked successfully." });
      router.push(`/solar/surveys/${docRef?.id}`);
    } catch (e) {
    console.error(e);
      toast({ variant: "destructive", title: "Transmission Error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isProfileLoading || isInquiryLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary h-10 w-10 opacity-20" /></div>;

  if (!inquiry) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-6 px-4">
         <div className="h-16 w-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner"><AlertTriangle className="h-8 w-8" /></div>
         <h2 className="text-xl font-black uppercase text-slate-900">Inquiry Node Missing</h2>
         <p className="text-muted-foreground text-sm font-medium leading-relaxed">Please start the survey from an active inquiry registry node to maintain data integrity.</p>
         <Button asChild variant="outline" className="rounded-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest"><Link href="/solar/inquiries">Back to Inquiries</Link></Button>
      </div>
    );
  }

  if (existingSurveyCount > 0) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-6 px-4">
         <div className="h-16 w-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner"><ShieldCheck className="h-8 w-8" /></div>
         <h2 className="text-xl font-black uppercase text-slate-900">Duplicate Node Blocked</h2>
         <p className="text-muted-foreground text-sm font-medium leading-relaxed">A Site Survey already exists for this inquiry. Multiple audits per node are restricted for consistency.</p>
         <Button asChild variant="outline" className="rounded-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest"><Link href={`/solar/inquiries/${inquiry.id}`}>Return to Inquiry</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 px-2 sm:px-4 text-left">
      <div className="flex items-center gap-4 text-left">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0"><Link href={`/solar/inquiries/${inquiry.id}`}><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div className="text-left">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Technical Audit</h1>
          <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1.5 opacity-60">Site Survey Node for {inquiry.customerName}</p>
        </div>
      </div>

      <SurveyForm 
        inquiry={inquiry} 
        teamMembers={teamMembers} 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
      />
    </div>
  );
}

export default function NewSolarSurveyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary h-10 w-10 opacity-20" /></div>}>
      <NewSurveyContent />
    </Suspense>
  );
}
