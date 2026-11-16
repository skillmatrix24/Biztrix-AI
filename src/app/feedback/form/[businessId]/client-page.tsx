"use client";

import { useState, useEffect } from "react";
import {
  Star,
  Send,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Info,
  ArrowRight,
  Sparkles,
  Calendar,
  AlertCircle,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  useAuth,
  setupRecaptcha,
  initiatePhoneSignIn,
} from "@/firebase";
import { doc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ConfirmationResult } from "firebase/auth";

const HighlightedText = ({
  text,
  highlight,
  color,
  isGradient,
  gradientEnd,
}: {
  text: string;
  highlight?: string;
  color?: string;
  isGradient?: boolean;
  gradientEnd?: string;
}) => {
  if (!highlight || !text || !highlight.trim()) return <>{text}</>;

  const parts = text.split(new RegExp(`(${highlight})`, "gi"));

  const highlightStyle: React.CSSProperties = isGradient
    ? {
        backgroundImage: `linear-gradient(to right, ${color || "#0C83B3"}, ${gradientEnd || "#2DD4BF"})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        display: "inline-block",
      }
    : {
        color: color || "inherit",
      };

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} style={highlightStyle} className="font-bold">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

export default function PublicFeedbackPage(props: {
  params: { businessId: string };
}) {
  const { businessId } = props.params;
  const firestore = useFirestore();
  const auth = useAuth();

  const bizRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business, isLoading: isBizLoading } = useDoc<any>(bizRef);

  const configRef = useMemoFirebase(
    () =>
      businessId
        ? doc(firestore, "businesses", businessId, "feedbackConfig", "main")
        : null,
    [firestore, businessId]
  );
  const { data: formConfig, isLoading: isConfigLoading } = useDoc<any>(configRef);

  const [formData, setFormData] = useState<any>({
    customerName: "",
    customerContact: "",
    rating: 5,
    category: "General",
    data: {},
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submissionId, setSubmissionId] = useState("");

  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "sending" | "sent" | "verified"
  >("idle");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (formConfig?.fields) {
      setFormData((prev: any) => {
        let changed = false;
        const newData = { ...prev.data };

        formConfig.fields.forEach((field: any) => {
          if (field.type === "rating" && newData[field.label] === undefined) {
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
        rating: currentRating === targetHalf ? targetFull : targetHalf,
      };
    });
  };

  const updateDynamicData = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      data: { ...prev.data, [key]: value },
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
          [key]: currentVal === targetHalf ? targetFull : targetHalf,
        },
      };
    });
  };

  const updateCheckboxGroup = (
    key: string,
    option: string,
    checked: boolean
  ) => {
    setFormData((prev: any) => {
      const current = prev.data[key] || [];
      const updated = checked
        ? [...current, option]
        : current.filter((o: string) => o !== option);
      return {
        ...prev,
        data: { ...prev.data, [key]: updated },
      };
    });
  };

  const handleSendOtp = async () => {
    if (!formData.customerContact || formData.customerContact.length < 10) {
      toast({
        variant: "destructive",
        title: "Invalid Number",
        description: "Please enter a valid mobile number.",
      });
      return;
    }
    setVerificationStatus("sending");
    try {
      const verifier = setupRecaptcha(auth, "recaptcha-container");
      const phone = formData.customerContact.startsWith("+")
        ? formData.customerContact
        : `+91${formData.customerContact}`;
      const result = await initiatePhoneSignIn(auth, phone, verifier);
      setConfirmationResult(result);
      setVerificationStatus("sent");
      toast({
        title: "OTP Sent",
        description: "Verification code sent to your mobile.",
      });
    } catch (e: any) {
      console.error(e);
      setVerificationStatus("idle");
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Failed to send OTP.",
      });
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmationResult) return;
    try {
      await confirmationResult.confirm(otp);
      setVerificationStatus("verified");
      toast({
        title: "Verified",
        description: "Mobile number verified successfully.",
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Invalid OTP",
        description: "Please check the code and try again.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    if (formConfig?.isOtpEnabled && verificationStatus !== "verified") {
      toast({
        variant: "destructive",
        title: "Verification Required",
        description: "Please verify your mobile number to submit feedback.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const feedbackRef = collection(
        firestore,
        "businesses",
        businessId,
        "feedback"
      );
      const docRef = await addDocumentNonBlocking(feedbackRef, {
        ...formData,
        businessId,
        status: "new",
        replies: [],
        createdAt: serverTimestamp(),
        isVerified: verificationStatus === "verified",
      });
      if (business?.ownerId) {
        addDocumentNonBlocking(
          collection(firestore, "businesses", businessId, "notifications"),
          {
            businessId,
            recipientId: business.ownerId,
            title: "New Feedback Received",
            message: `${formData.customerName} submitted feedback for ${formData.category}`,
            type: "message",
            isRead: false,
            createdAt: serverTimestamp(),
          }
        );
      }
      setSubmissionId(docRef?.id || "");
      setIsSuccess(true);
      toast({
        title: "Feedback Received",
        description: "Thank you for your valuable input!",
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not submit. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isBizLoading || isConfigLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
        <div className="max-w-md w-full space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Feedback Registered
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Thank you {formData.customerName}, your feedback has been sent to the team at{" "}
              <strong className="text-slate-900">{business?.name}</strong>.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Tracking Reference Code
              </p>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1 tabular-nums">
                {submissionId.slice(-8).toUpperCase()}
              </p>
            </div>
            <div className="border-t border-slate-200 pt-4">
              <Button
                asChild
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl"
              >
                <Link href={`/feedback/track/${businessId}/${submissionId}`}>
                  Track Progress & Replies <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-400">Powered by Biztrix AI</p>
        </div>
      </div>
    );
  }

  const titleFont = formConfig?.titleFont || "Mukta";
  const descFont = formConfig?.descriptionFont || "Mukta";
  const titleSize = formConfig?.titleFontSize
    ? `${formConfig.titleFontSize}px`
    : undefined;
  const descSize = formConfig?.descriptionFontSize
    ? `${formConfig.descriptionFontSize}px`
    : undefined;

  const fontsToLoad = Array.from(new Set([titleFont, descFont]));
  const fontUrl = `https://fonts.googleapis.com/css2?${fontsToLoad
    .map((f) => `family=${f.replace(" ", "+")}:wght@400;700;900`)
    .join("&")}&display=swap`;

  return (
    <div className="min-h-screen bg-slate-50 font-body pb-20 overflow-x-hidden">
      <link rel="stylesheet" href={fontUrl} />
      <div id="recaptcha-container" />
      <header className="bg-white border-b border-slate-200 h-16 flex items-center sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
              {formConfig?.logoUrl ? (
                <img
                  src={formConfig.logoUrl}
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
                {business?.name || "Customer Feedback"}
              </span>
              <span className="text-xs font-medium text-emerald-700">
                Verified Feedback Portal
              </span>
            </div>
          </div>
          <ShieldCheck className="h-5 w-5 text-slate-400" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 space-y-10">
        <div className="text-center space-y-5">
          <div className="flex flex-col items-center gap-4">
            <div className="h-20 w-20 bg-white rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden">
              {formConfig?.logoUrl ? (
                <img
                  src={formConfig.logoUrl}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                  alt="Hero Logo"
                />
              ) : (
                <div className="h-full w-full bg-slate-900 flex items-center justify-center text-white font-bold text-2xl">
                  {business?.name?.charAt(0) || "B"}
                </div>
              )}
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              <Sparkles className="h-3.5 w-3.5" /> We Value Your Voice
            </span>
          </div>

          <div className="space-y-3">
            <h1
              className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto"
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
              className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed"
              style={{ fontFamily: descFont, fontSize: descSize }}
            >
              <HighlightedText
                text={
                  formConfig?.description ||
                  "Your feedback helps us innovate and provide better service to our customers."
                }
                highlight={formConfig?.descriptionHighlightWord}
                color={formConfig?.descriptionHighlightColor}
                isGradient={formConfig?.descriptionHighlightGradient}
                gradientEnd={formConfig?.descriptionGradientEnd}
              />
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 sm:p-8 bg-slate-900 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="text-center sm:text-left">
                  <p className="text-xs font-semibold text-amber-300">
                    Overall Experience
                  </p>
                  <h2 className="text-lg sm:text-xl font-bold mt-1">
                    How would you rate us?
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Click once for 0.5 · Click twice for full star
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Rate ${i} out of 5 stars`}
                        onClick={() => handleRatingClick(i)}
                        className={cn(
                          "h-9 w-9 rounded-xl flex items-center justify-center transition-colors border relative overflow-hidden",
                          formData.rating >= i - 0.5
                            ? "border-amber-400 bg-amber-400/15"
                            : "bg-white/5 border-white/15"
                        )}
                      >
                        <div className="relative h-5 w-5">
                          <Star className="absolute inset-0 h-full w-full text-white/25" />
                          {formData.rating >= i - 0.5 && (
                            <Star
                              className="absolute inset-0 h-full w-full fill-amber-400 text-amber-400"
                              style={{
                                clipPath:
                                  formData.rating === i - 0.5
                                    ? "polygon(0 0, 50% 0, 50% 100%, 0% 100%)"
                                    : "none",
                              }}
                            />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="h-9 min-w-[2.5rem] px-2.5 rounded-xl bg-amber-400 flex items-center justify-center font-bold font-mono tabular-nums text-slate-900 text-sm">
                    {formData.rating}
                  </div>
                </div>
              </div>
              {formData.rating <= 3.5 && (
                <div className="w-full mt-5 pt-5 border-t border-white/10">
                  <Label className="text-xs font-semibold text-amber-300 mb-2 block">
                    Please tell us why you gave this rating so we can improve
                  </Label>
                  <Textarea
                    placeholder="Share details..."
                    value={formData.overallReason || ""}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        overallReason: e.target.value,
                      }))
                    }
                    className="min-h-[90px] rounded-xl bg-white/10 border-white/15 text-white p-3.5 text-sm placeholder:text-white/40"
                  />
                </div>
              )}
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Your Full Name *
                  </Label>
                  <Input
                    required
                    value={formData.customerName}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        customerName: e.target.value,
                      }))
                    }
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-medium text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Mobile Number *
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        required
                        disabled={verificationStatus === "verified"}
                        value={formData.customerContact}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            customerContact: e.target.value.replace(/\D/g, ""),
                          }))
                        }
                        className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 font-mono tabular-nums text-sm"
                      />
                    </div>
                    {formConfig?.isOtpEnabled &&
                      verificationStatus !== "verified" && (
                        <Button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={verificationStatus === "sending"}
                          className="h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5"
                        >
                          {verificationStatus === "sending" ? (
                            <Loader2 className="animate-spin h-4 w-4" />
                          ) : (
                            "Verify"
                          )}
                        </Button>
                      )}
                    {verificationStatus === "verified" && (
                      <div className="h-11 px-4 rounded-xl bg-emerald-50 flex items-center gap-1.5 border border-emerald-200 text-emerald-700 font-semibold text-xs">
                        <CheckCircle2 className="h-4 w-4" /> Verified
                      </div>
                    )}
                  </div>

                  {verificationStatus === "sent" && (
                    <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                      <Label className="text-xs font-semibold text-slate-600 block">
                        Enter 6-digit Verification Code
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="000000"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="h-11 rounded-xl text-center font-mono tabular-nums tracking-widest font-bold text-base flex-1 bg-white border-slate-200"
                        />
                        <Button
                          type="button"
                          onClick={handleVerifyOtp}
                          className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 font-semibold text-xs"
                        >
                          Verify
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {formConfig?.fields?.length > 0 && (
                <div className="grid grid-cols-1 gap-6 border-t border-slate-200 pt-6">
                  {formConfig.fields.map((field: any) => (
                    <div key={field.id} className="space-y-2">
                      {field.type !== "paragraph" && (
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-slate-700">
                            {field.label}{" "}
                            {field.required && (
                              <span className="text-rose-600">*</span>
                            )}
                          </Label>
                          {field.type === "rating" &&
                            (formData.data[field.label] || 0) > 0 && (
                              <span className="inline-flex items-center rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-bold font-mono tabular-nums text-amber-900">
                                {formData.data[field.label]} / 5
                              </span>
                            )}
                        </div>
                      )}
                      {field.type === "text" && (
                        <Input
                          required={field.required}
                          onChange={(e) =>
                            updateDynamicData(field.label, e.target.value)
                          }
                          className="h-11 rounded-xl border-slate-200 bg-white text-sm"
                        />
                      )}
                      {field.type === "textarea" && (
                        <Textarea
                          required={field.required}
                          onChange={(e) =>
                            updateDynamicData(field.label, e.target.value)
                          }
                          placeholder="Share details..."
                          className="min-h-[100px] rounded-xl border-slate-200 bg-white p-3.5 text-sm"
                        />
                      )}
                      {field.type === "paragraph" && (
                        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                          {field.label}
                        </p>
                      )}
                      {field.type === "date" && (
                        <div className="relative">
                          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            type="date"
                            required={field.required}
                            onChange={(e) =>
                              updateDynamicData(field.label, e.target.value)
                            }
                            className="h-11 pl-10 pr-4 rounded-xl border-slate-200 bg-white text-sm w-full font-mono tabular-nums"
                          />
                        </div>
                      )}
                      {field.type === "checkbox" && (
                        <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                          <Checkbox
                            id={field.id}
                            checked={!!formData.data[field.label]}
                            onCheckedChange={(checked) =>
                              updateDynamicData(field.label, !!checked)
                            }
                          />
                          <Label
                            htmlFor={field.id}
                            className="text-sm font-medium cursor-pointer flex-1 text-slate-700"
                          >
                            {field.label}
                          </Label>
                        </div>
                      )}
                      {field.type === "checkbox-group" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {(field.options || "")
                            .split(",")
                            .map((opt: string) => {
                              const optionValue = opt.trim();
                              const isChecked = (
                                formData.data[field.label] || []
                              ).includes(optionValue);
                              return (
                                <div
                                  key={optionValue}
                                  className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200"
                                >
                                  <Checkbox
                                    id={`${field.id}_${optionValue}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) =>
                                      updateCheckboxGroup(
                                        field.label,
                                        optionValue,
                                        !!checked
                                      )
                                    }
                                  />
                                  <Label
                                    htmlFor={`${field.id}_${optionValue}`}
                                    className="text-sm font-medium text-slate-700 cursor-pointer flex-1"
                                  >
                                    {optionValue}
                                  </Label>
                                </div>
                              );
                            })}
                        </div>
                      )}
                      {field.type === "select" && (
                        <Select
                          required={field.required}
                          onValueChange={(v) =>
                            updateDynamicData(field.label, v)
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-sm">
                            <SelectValue placeholder="Choose an option..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200">
                            {(field.options || "")
                              .split(",")
                              .map((opt: string) => (
                                <SelectItem
                                  key={opt.trim()}
                                  value={opt.trim()}
                                  className="text-sm"
                                >
                                  {opt.trim()}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                      {field.type === "rating" && (
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 w-fit">
                            <div className="flex items-center gap-1.5">
                              {[1, 2, 3, 4, 5].map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  aria-label={`Rate ${field.label} ${v} out of 5 stars`}
                                  onClick={() =>
                                    handleDynamicRatingClick(field.label, v)
                                  }
                                  className={cn(
                                    "h-8 w-8 rounded-lg flex items-center justify-center border transition-colors relative overflow-hidden",
                                    (formData.data[field.label] || 0) >= v - 0.5
                                      ? "border-amber-400 bg-amber-50"
                                      : "bg-white border-slate-200"
                                  )}
                                >
                                  <div className="relative h-4 w-4">
                                    <Star className="absolute inset-0 h-full w-full text-slate-300" />
                                    {(formData.data[field.label] || 0) >=
                                      v - 0.5 && (
                                      <Star
                                        className="absolute inset-0 h-full w-full fill-amber-400 text-amber-400"
                                        style={{
                                          clipPath:
                                            formData.data[field.label] ===
                                            v - 0.5
                                              ? "polygon(0 0, 50% 0, 50% 100%, 0% 100%)"
                                              : "none",
                                        }}
                                      />
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                            <span className="h-8 min-w-[2.25rem] px-2 rounded-lg bg-amber-400 text-slate-900 flex items-center justify-center font-bold font-mono tabular-nums text-xs">
                              {formData.data[field.label] || 0}
                            </span>
                          </div>
                          {(formData.data[field.label] || 0) <= 3.5 &&
                            (formData.data[field.label] || 0) > 0 && (
                              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 text-amber-700" />
                                  <Label className="text-xs font-semibold text-amber-900">
                                    How can we improve this experience?
                                  </Label>
                                </div>
                                <Textarea
                                  placeholder="Share suggestions or concerns..."
                                  onChange={(e) =>
                                    updateDynamicData(
                                      field.label + "_reason",
                                      e.target.value
                                    )
                                  }
                                  className="min-h-[90px] rounded-xl bg-white border-amber-200 text-sm"
                                />
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (formConfig?.isOtpEnabled &&
                      verificationStatus !== "verified")
                  }
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" /> Submit Feedback
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 bg-sky-50 rounded-2xl border border-sky-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-white border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
            <Info className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-bold text-slate-900">Response Timeline</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Our team typically responds to customer feedback within 24 business
              hours. You will receive a tracking link right after submission.
            </p>
          </div>
        </div>
      </main>

      <footer className="mt-20 py-8 border-t border-slate-200 bg-white text-center px-4">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="h-7 w-7 bg-slate-900 rounded-lg flex items-center justify-center text-white text-xs font-bold">
            B
          </div>
          <span className="text-sm font-bold text-slate-900">Biztrix AI</span>
        </div>
        <p className="text-xs text-slate-500">
          Encrypted Feedback Portal · {business?.name || "Biztrix Workspace"}
        </p>
      </footer>
    </div>
  );
}
