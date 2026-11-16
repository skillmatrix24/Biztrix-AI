"use client";

import { useState, useEffect, Suspense } from "react";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyStatePanel } from "@/components/ui/editorial";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  useCollection,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from "@/firebase";
import {
  collection,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SurveyForm } from "../../components/SurveyForm";
import { createSolarNotification } from "@/firebase/solar-notifications";

function NewSurveyContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const incomingInquiryId = searchParams.get("inquiryId");

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const [inquiry, setInquiry] = useState<any>(null);
  const [isInquiryLoading, setIsInquiryLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingSurveyCount, setExistingSurveyCount] = useState(0);

  const teamQuery = useMemoFirebase(
    () =>
      businessId
        ? query(
            collection(firestore, "users"),
            where("businessId", "==", businessId)
          )
        : null,
    [firestore, businessId]
  );
  const { data: teamMembers = [] } = useCollection<any>(teamQuery);

  useEffect(() => {
    async function loadInquiry() {
      if (!incomingInquiryId || !businessId) return;
      setIsInquiryLoading(true);
      try {
        const docRef = doc(
          firestore,
          "businesses",
          businessId,
          "solarInquiries",
          incomingInquiryId
        );
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setInquiry({ ...snap.data(), id: snap.id });

          const sQuery = query(
            collection(firestore, "businesses", businessId, "solarSurveys"),
            where("inquiryId", "==", incomingInquiryId)
          );
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

    if (existingSurveyCount > 0) {
      toast({
        variant: "destructive",
        title: "Duplicate Prevented",
        description: "A site survey already exists for this inquiry.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const surveysRef = collection(
        firestore,
        "businesses",
        businessId,
        "solarSurveys"
      );
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
        updatedAt: serverTimestamp(),
      });

      const inqRef = doc(
        firestore,
        "businesses",
        businessId,
        "solarInquiries",
        inquiry.id
      );
      updateDocumentNonBlocking(inqRef, {
        status: "SITE_SURVEY_PENDING",
        updatedAt: serverTimestamp(),
      });

      if (data.assignedTo && docRef) {
        createSolarNotification(firestore, {
          businessId,
          recipientId: data.assignedTo,
          title: "New Survey Assigned",
          message: `Technical audit scheduled for ${inquiry.customerName} on ${data.surveyDate}.`,
          type: "solar_alert",
          severity: "INFO",
          entityType: "SOLAR_SURVEY",
          entityId: docRef.id,
        });
      }

      toast({
        title: "Site Survey Saved",
        description: "Survey record created and linked to inquiry.",
      });
      router.push(`/solar/surveys/${docRef?.id}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Save Failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isProfileLoading || isInquiryLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-600 h-8 w-8" />
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="max-w-xl mx-auto py-16">
        <EmptyStatePanel
          icon={AlertTriangle}
          title="Inquiry Missing"
          description="Please start a site survey from an active solar inquiry to preserve traceability."
          action={
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/solar/inquiries">Back to Inquiries</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (existingSurveyCount > 0) {
    return (
      <div className="max-w-xl mx-auto py-16">
        <EmptyStatePanel
          icon={ShieldCheck}
          title="Survey Already Exists"
          description="A site survey is already linked to this inquiry. Open the existing survey to update measurements."
          action={
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/solar/inquiries/${inquiry.id}`}>
                Return to Inquiry
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 text-left">
      <PageHeader
        backHref={`/solar/inquiries/${inquiry.id}`}
        backLabel="Back to Inquiry"
        title="Technical Site Survey"
        description={`Site assessment form for ${inquiry.customerName}`}
      />

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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-slate-600 h-8 w-8" />
        </div>
      }
    >
      <NewSurveyContent />
    </Suspense>
  );
}
