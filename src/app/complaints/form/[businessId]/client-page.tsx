"use client";

import { useState, useRef } from "react";
import {
  Headset,
  Send,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  MessageSquare,
  ArrowRight,
  Smartphone,
  X,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  useDoc,
  useMemoFirebase,
  addDocumentNonBlocking,
} from "@/firebase";
import { doc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

export default function PublicComplaintForm(props: {
  params: { businessId: string };
}) {
  const { businessId } = props.params;
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bizRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business, isLoading: isBizLoading } = useDoc<any>(bizRef);

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    subject: "",
    description: "",
    category: "Service",
    priority: "medium",
    branchLocation: "Main",
    mediaUrls: [] as string[],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [docId, setDocId] = useState("");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({
            ...prev,
            mediaUrls: [...(prev.mediaUrls || []), reader.result as string],
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
      const complaintsRef = collection(
        firestore,
        "businesses",
        businessId,
        "complaints"
      );

      const docRef = await addDocumentNonBlocking(complaintsRef, {
        ...formData,
        ticketId: generatedTicketId,
        businessId,
        status: "new",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (business?.ownerId) {
        addDocumentNonBlocking(
          collection(firestore, "businesses", businessId, "notifications"),
          {
            businessId,
            recipientId: business.ownerId,
            title: "New Support Ticket",
            message: `${formData.customerName} filed a complaint: ${formData.subject}`,
            type: "message",
            isRead: false,
            createdAt: serverTimestamp(),
          }
        );
      }

      setTicketId(generatedTicketId);
      if (docRef) setDocId(docRef.id);
      setIsSuccess(true);
      toast({
        title: "Ticket Created",
        description: "The support team has been notified.",
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isBizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Ticket Registered
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Thank you {formData.customerName}, your support request has been logged with{" "}
              <strong className="text-slate-900">{business?.name}</strong>.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-500">Ticket ID</p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1 tabular-nums">
                {ticketId}
              </p>
            </div>
            <div className="border-t border-slate-200 pt-4">
              <Button
                asChild
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl"
              >
                <Link href={`/complaints/track/${businessId}/${docId}`}>
                  Track Live Status <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-400">Powered by Biztrix AI</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-20 overflow-x-hidden text-left">
      <header className="bg-white border-b border-slate-200 h-16 flex items-center sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
              {business?.logoUrl ? (
                <img
                  src={business.logoUrl}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain p-1"
                  alt={business?.name ? `${business.name} logo` : "Business logo"}
                />
              ) : (
                <div className="h-full w-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
                  {business?.name?.charAt(0) || "B"}
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-900 truncate">
                {business?.name || "Support Desk"}
              </span>
              <span className="text-xs font-medium text-sky-700">
                Resolution Center
              </span>
            </div>
          </div>
          <ShieldCheck className="h-5 w-5 text-slate-400" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 space-y-10">
        <div className="text-center space-y-4">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center border border-slate-200">
              <Headset className="h-8 w-8 text-slate-900" />
            </div>
            <span className="inline-flex items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              Verified Support Intake
            </span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              We&apos;re Here to Help
            </h1>
            <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Share your concern with clear details so our team can resolve it promptly.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold">Submit Support Ticket</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Contact & issue details
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Full Name *
                  </Label>
                  <Input
                    required
                    value={formData.customerName || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, customerName: e.target.value })
                    }
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Mobile Number *
                  </Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      required
                      value={formData.customerPhone || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customerPhone: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      placeholder="91XXXXXXXX"
                      className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 font-mono tabular-nums text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Subject *
                  </Label>
                  <Input
                    required
                    value={formData.subject || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    placeholder="e.g. Delayed Delivery / Billing Issue"
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Department Category
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) =>
                      setFormData({ ...formData, category: v })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      <SelectItem value="Service">Technical Service</SelectItem>
                      <SelectItem value="Product">Product Quality</SelectItem>
                      <SelectItem value="Billing">Billing & Payments</SelectItem>
                      <SelectItem value="Logistics">
                        Logistics & Delivery
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Target Branch
                  </Label>
                  <Select
                    value={formData.branchLocation}
                    onValueChange={(v) =>
                      setFormData({ ...formData, branchLocation: v })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      <SelectItem value="Main">Main Office</SelectItem>
                      {(business?.branchLocations || []).map((b: string) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">
                  Describe the issue in detail *
                </Label>
                <Textarea
                  required
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Write all relevant details here..."
                  className="min-h-[130px] rounded-xl bg-slate-50 border-slate-200 p-4 text-sm leading-relaxed"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-semibold text-slate-700">
                  Photos / Attachments (Optional)
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {formData.mediaUrls.map((url, i) => (
                    <div
                      key={i}
                      className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group"
                    >
                      <img
                        src={url}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        alt={`Attachment ${i + 1}`}
                      />
                      <button
                        type="button"
                        aria-label={`Remove attachment ${i + 1}`}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            mediaUrls: prev.mediaUrls.filter(
                              (_, idx) => idx !== i
                            ),
                          }))
                        }
                        className="absolute top-2 right-2 bg-white border border-slate-200 rounded-lg p-1 text-rose-600 hover:bg-rose-50"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
                  >
                    <Upload className="h-5 w-5 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-600">
                      Upload Photo
                    </span>
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Submit Support Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
