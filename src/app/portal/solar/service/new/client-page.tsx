"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  Loader2,
  Wrench,
  Info,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
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
  SelectValue,
} from "@/components/ui/select";
import {
  useFirestore,
  useMemoFirebase,
  addDocumentNonBlocking,
  useUser,
  useCollection,
} from "@/firebase";
import {
  doc,
  collection,
  serverTimestamp,
  getDocs,
  getDoc,
  query,
  where,
  limit,
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const CATEGORIES = [
  { id: "GENERAL_SERVICE", label: "General Service" },
  { id: "SYSTEM_FAULT", label: "System Fault (No Generation)" },
  { id: "PANEL_ISSUE", label: "Physical Panel Issue" },
  { id: "INVERTER_ISSUE", label: "Inverter / Display Issue" },
  { id: "MONITORING_ISSUE", label: "App / Monitoring Offline" },
  { id: "WARRANTY_CLAIM", label: "Warranty Claim" },
];

export default function PublicServiceRequestForm() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const searchParams = useSearchParams();
  const bIdFromUrl = searchParams.get("bId");

  const [customer, setCustomer] = useState<any>(null);
  const [businessId, setBusinessId] = useState<string | null>(bIdFromUrl);
  const [isIdentityLoading, setIsIdentityLoading] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !user) {
      window.location.assign(`/portal/solar/login?bId=${bIdFromUrl || ""}`);
      return;
    }
    async function resolve() {
      if (isUserLoading) return;
      if (!user?.phoneNumber) {
        setIsIdentityLoading(false);
        return;
      }
      setIsIdentityLoading(true);
      try {
        const phone = user.phoneNumber.replace("+91", "");
        const businessesSnap = await getDocs(
          collection(firestore, "businesses")
        );
        for (const bizDoc of businessesSnap.docs) {
          const q = query(
            collection(firestore, "businesses", bizDoc.id, "customers"),
            where("phone", "==", phone),
            limit(1)
          );
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
  }, [user, isUserLoading, firestore, bIdFromUrl]);

  const installationsQuery = useMemoFirebase(
    () =>
      businessId && customer?.id
        ? query(
            collection(
              firestore,
              "businesses",
              businessId,
              "solarInstallations"
            ),
            where("customerId", "==", customer.id)
          )
        : null,
    [firestore, businessId, customer?.id]
  );
  const { data: installations = [] } = useCollection<any>(installationsQuery);

  const [formData, setFormData] = useState({
    installationId: "",
    category: "GENERAL_SERVICE",
    description: "",
    priority: "medium",
    requestSource: "Customer Portal",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !customer || !formData.installationId) {
      toast({
        variant: "destructive",
        title: "Missing Selection",
        description: "Please select your solar installation.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const serviceRef = collection(
        firestore,
        "businesses",
        businessId,
        "solarServiceRequests"
      );
      const install = installations.find(
        (i) => i.id === formData.installationId
      );

      await addDocumentNonBlocking(serviceRef, {
        ...formData,
        businessId,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        warrantyId: install?.activeWarrantyId || null,
        status: "OPEN",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const bizSnap = await getDoc(doc(firestore, "businesses", businessId));
      const bizData = bizSnap.data();
      if (bizData?.ownerId) {
        addDocumentNonBlocking(
          collection(firestore, "businesses", businessId, "notifications"),
          {
            businessId,
            recipientId: bizData.ownerId,
            title: "New Customer Service Request",
            message: `${customer.name} raised a ticket for ${formData.category}`,
            type: "service",
            isRead: false,
            createdAt: serverTimestamp(),
          }
        );
      }

      setIsSuccess(true);
      toast({ title: "Service Request Submitted" });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Submission failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isIdentityLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 space-y-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Request Received
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your support ticket has been logged. Our technical team will review
              and schedule a visit shortly.
            </p>
          </div>
          <Button
            asChild
            className="w-full h-11 bg-primary font-semibold text-xs rounded-xl"
          >
            <Link href={`/portal/solar?bId=${businessId}`}>
              Return to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16 text-left">
      <header className="bg-white border-b border-slate-200 h-16 sm:h-20 flex items-center sticky top-0 z-50 px-4">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Back to portal"
              className="h-9 w-9 rounded-xl shrink-0"
            >
              <Link href={`/portal/solar?bId=${businessId}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900">
              Open Service Ticket
            </h1>
          </div>
          <Badge
            variant="outline"
            className="h-6 px-3 border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full"
          >
            Client Support
          </Badge>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center mx-auto border border-slate-200">
            <Wrench className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Technical Support Request
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
            Describe your solar system issue clearly so our engineers can assign
            the right specialist.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-none">
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary shrink-0 border border-slate-200">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Ticket Details
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select your system and specify the concern
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Select Solar System *
                </Label>
                <Select
                  value={formData.installationId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, installationId: v })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-medium text-sm">
                    <SelectValue placeholder="Choose installation..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {installations.map((inst) => (
                      <SelectItem
                        key={inst.id}
                        value={inst.id}
                        className="text-sm font-medium"
                      >
                        {inst.installationNumber} — {inst.capacityKw} kW
                      </SelectItem>
                    ))}
                    {installations.length === 0 && (
                      <SelectItem value="none" disabled>
                        No active systems found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Issue Category *
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData({ ...formData, category: v })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-medium text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CATEGORIES.map((cat) => (
                      <SelectItem
                        key={cat.id}
                        value={cat.id}
                        className="text-sm font-medium"
                      >
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="service-desc"
                  className="text-xs font-semibold text-slate-700"
                >
                  Describe the Issue in Detail *
                </Label>
                <Textarea
                  id="service-desc"
                  required
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe the concern (e.g., Inverter red warning light, panel cleaning needed)"
                  className="min-h-[140px] rounded-xl bg-slate-50 border-slate-200 p-4 text-sm leading-relaxed"
                />
              </div>
            </CardContent>
            <CardFooter className="p-6 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting || !formData.installationId}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-xl"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Submit Service Request
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>

        <div className="p-5 bg-blue-50 rounded-2xl border border-blue-200 flex items-start gap-3.5">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1 text-left">
            <p className="text-xs font-bold text-primary">Response Time</p>
            <p className="text-xs text-slate-700 leading-relaxed">
              Our technical team typically responds within 24 business hours. You
              can track ticket status from your portal dashboard.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}