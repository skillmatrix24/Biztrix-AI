"use client";

import { useState } from "react";
import {
  MessageSquare,
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  Bot,
  History,
  ShieldCheck,
  Star,
  Send,
  Loader2,
  BadgeCheck,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/editorial";
import {
  useFirestore,
  useDoc,
  useMemoFirebase,
  updateDocumentNonBlocking,
} from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

export default function CustomerFeedbackTrackPage(props: {
  params: { businessId: string; feedbackId: string };
}) {
  const { businessId, feedbackId } = props.params;
  const firestore = useFirestore();

  const feedbackRef = useMemoFirebase(
    () =>
      businessId && feedbackId
        ? doc(firestore, "businesses", businessId, "feedback", feedbackId)
        : null,
    [firestore, businessId, feedbackId]
  );
  const {
    data: feedback,
    isLoading: isFeedbackLoading,
    error,
  } = useDoc<any>(feedbackRef);

  const bizRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(bizRef);

  const configRef = useMemoFirebase(
    () =>
      businessId
        ? doc(firestore, "businesses", businessId, "feedbackConfig", "main")
        : null,
    [firestore, businessId]
  );
  const { data: formConfig } = useDoc<any>(configRef);

  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const STATUS_CONFIG: Record<
    string,
    {
      label: string;
      color: string;
      bg: string;
      icon: React.ComponentType<{ className?: string }>;
    }
  > = {
    new: {
      label: "Submitted",
      color: "text-sky-700",
      bg: "bg-sky-50 border-sky-200",
      icon: Clock,
    },
    pending: {
      label: "Under Review",
      color: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
      icon: History,
    },
    resolved: {
      label: "Resolved",
      color: "text-emerald-700",
      bg: "bg-emerald-50 border-emerald-200",
      icon: CheckCircle2,
    },
    closed: {
      label: "Closed",
      color: "text-slate-700",
      bg: "bg-slate-100 border-slate-200",
      icon: ShieldCheck,
    },
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !feedback || !businessId) return;
    setIsReplying(true);

    const newReply = {
      text: replyText,
      author: feedback.customerName,
      timestamp: new Date().toISOString(),
      role: "customer",
    };

    updateDocumentNonBlocking(feedbackRef!, {
      replies: [...(feedback.replies || []), newReply],
      updatedAt: serverTimestamp(),
    });

    setReplyText("");
    setIsReplying(false);
    toast({ title: "Reply Sent", description: "The team has been notified." });
  };

  const whatsappNumber =
    formConfig?.supportWhatsapp || business?.phone?.replace(/\D/g, "") || "";
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        `Namaste! I need assistance with my feedback ticket: ${feedbackId
          .slice(-8)
          .toUpperCase()}`
      )}`
    : null;

  if (isFeedbackLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h2 className="text-xl font-bold text-slate-900">
          Feedback Ticket Not Found
        </h2>
        <Button asChild variant="outline" className="mt-4 rounded-xl border-slate-200">
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[feedback.status || "new"] || STATUS_CONFIG.new;

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-20 overflow-x-hidden text-left">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 h-16 flex items-center">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
              {business?.logoUrl ? (
                <img
                  src={business.logoUrl}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                  alt="Logo"
                />
              ) : (
                <div className="h-full w-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
                  {business?.name?.charAt(0) || "B"}
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-900 truncate">
                {business?.name || "Feedback Portal"}
              </span>
              <span className="text-xs font-medium text-sky-700">
                Feedback Status Portal
              </span>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200 text-xs font-semibold text-slate-700"
          >
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="space-y-1.5">
            <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700 font-mono tabular-nums">
              Ticket ID: {feedbackId.slice(-8).toUpperCase()}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Track Your Feedback
            </h1>
            <p className="text-sm text-slate-600 flex items-center gap-1.5">
              <User className="h-4 w-4 text-slate-400" /> Filed by{" "}
              <span className="font-semibold text-slate-900">
                {feedback.customerName}
              </span>
            </p>
          </div>
          <div
            className={cn(
              "px-5 py-3.5 rounded-xl border flex items-center gap-3.5 shrink-0",
              statusInfo.bg
            )}
          >
            <statusInfo.icon className={cn("h-6 w-6", statusInfo.color)} />
            <div>
              <p className="text-xs font-medium text-slate-600">Ticket Status</p>
              <p className={cn("text-base font-bold leading-tight", statusInfo.color)}>
                {statusInfo.label}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <SectionCard
              title="Conversation History"
              description="Your initial feedback submission and replies from our team."
            >
              <div className="space-y-6">
                <div className="flex gap-3.5">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                    {feedback.customerName?.charAt(0) || "C"}
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="inline-flex items-center rounded-lg bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                          {feedback.category || "General"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono tabular-nums text-amber-700">
                            {feedback.rating} / 5
                          </span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div key={i} className="relative h-3.5 w-3.5">
                                <Star className="absolute inset-0 h-full w-full text-slate-300" />
                                {feedback.rating >= i - 0.5 && (
                                  <Star
                                    className="absolute inset-0 h-full w-full fill-amber-400 text-amber-400"
                                    style={{
                                      clipPath:
                                        feedback.rating === i - 0.5
                                          ? "polygon(0 0, 50% 0, 50% 100%, 0% 100%)"
                                          : "none",
                                    }}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {Object.entries(feedback.data || {}).map(
                          ([key, value]: [string, any]) => (
                            <div key={key} className="space-y-0.5">
                              <p className="text-xs font-semibold text-slate-500">
                                {key}
                              </p>
                              <p className="text-sm font-medium text-slate-900">
                                {Array.isArray(value)
                                  ? value.join(", ")
                                  : value?.toString()}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-mono tabular-nums px-1">
                      {feedback.createdAt?.toDate
                        ? feedback.createdAt.toDate().toLocaleString()
                        : "Submitted"}
                    </p>
                  </div>
                </div>

                {(feedback.replies || []).map((reply: any, i: number) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-3.5",
                      reply.role === "admin" ? "flex-row-reverse" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border",
                        reply.role === "admin"
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-slate-100 border-slate-200 text-slate-700"
                      )}
                    >
                      {reply.role === "admin" ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        reply.author?.charAt(0) || "C"
                      )}
                    </div>
                    <div
                      className={cn(
                        "flex-1 space-y-1.5 min-w-0",
                        reply.role === "admin" ? "text-right" : ""
                      )}
                    >
                      <div
                        className={cn(
                          "p-4 rounded-2xl border inline-block max-w-[90%] text-left",
                          reply.role === "admin"
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white border-slate-200 text-slate-900"
                        )}
                      >
                        {reply.role === "admin" && (
                          <p className="text-xs font-semibold text-amber-300 mb-1.5 flex items-center gap-1">
                            <BadgeCheck className="h-3.5 w-3.5" /> Team Response
                          </p>
                        )}
                        <p className="text-sm leading-relaxed">{reply.text}</p>
                      </div>
                      <p className="text-xs text-slate-500 font-mono tabular-nums px-1">
                        {new Date(reply.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {feedback.status !== "closed" && (
              <SectionCard
                title="Add a Follow-Up"
                description="Send an additional note to the support team."
              >
                <div className="space-y-3">
                  <Label className="sr-only" htmlFor="feedback-reply">
                    Follow-up message
                  </Label>
                  <div className="relative">
                    <Textarea
                      id="feedback-reply"
                      placeholder="Need to add more details? Write here..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="min-h-[110px] rounded-xl bg-slate-50 border-slate-200 p-3.5 text-sm pr-14"
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyText.trim() || isReplying}
                      aria-label="Send follow-up reply"
                      className="absolute bottom-3 right-3 h-9 w-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white p-0"
                    >
                      {isReplying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </SectionCard>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <SectionCard
              title="Need Immediate Help?"
              description="Reach our support desk directly for urgent updates."
            >
              {whatsappUrl ? (
                <Button
                  asChild
                  variant="outline"
                  className="w-full h-11 rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold text-xs"
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 mr-2" /> Message on WhatsApp
                  </a>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    toast({
                      variant: "destructive",
                      title: "Contact Unavailable",
                      description:
                        "The business has not configured a support number yet.",
                    })
                  }
                  className="w-full h-11 rounded-xl border-slate-200 text-slate-600 font-semibold text-xs"
                >
                  <MessageSquare className="h-4 w-4 mr-2" /> Support Number Unavailable
                </Button>
              )}
            </SectionCard>

            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-white space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <Star className="h-5 w-5 text-amber-400" />
                </div>
                <p className="text-sm font-bold">Our Promise</p>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Every customer feedback submission is reviewed by our team to
                improve {business?.name || "our service"}. We value your trust.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-20 py-8 bg-white border-t border-slate-200 text-center">
        <p className="text-xs text-slate-500">
          Biztrix Feedback Portal · Encrypted Connection
        </p>
      </footer>
    </div>
  );
}
