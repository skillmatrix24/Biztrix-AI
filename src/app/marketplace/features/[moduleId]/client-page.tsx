"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Briefcase,
  Building,
  Calculator,
  CheckCircle2,
  FileSpreadsheet,
  Gem,
  Globe,
  Headset,
  IdCard,
  Layout,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  ListTodo,
  MessageSquare,
  Palette,
  Power,
  Receipt,
  ScanLine,
  SearchCode,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  SmartphoneNfc,
  Sun,
  Target,
  Ticket,
  Trophy,
  Users,
  Users2,
  Wallet,
  Zap,
} from "lucide-react";
import { doc } from "firebase/firestore";
import {
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
  updateDocumentNonBlocking,
} from "@/firebase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import {
  buildIndividualModuleDetail,
  calculateMarketplacePrice,
  getItemWorkspaceLink,
  MARKETPLACE_META,
  type MarketplaceBillingCycle,
} from "@/lib/marketplace-catalog";
import { useMarketplaceCatalog } from "@/hooks/use-marketplace-catalog";
import { getModuleDetail } from "../../data";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  SearchCode,
  Ticket,
  Users,
  IdCard,
  Zap,
  Building,
  Target,
  Trophy,
  Bot,
  SmartphoneNfc,
  Briefcase,
  Headset,
  Wallet,
  Calculator,
  MessageSquare,
  Smartphone,
  Gem,
  LineChart,
  ShoppingBag,
  ListTodo,
  Users2,
  Lightbulb,
  ScanLine,
  Palette,
  Globe,
  Sun,
  Receipt,
  FileSpreadsheet,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] || Bot;
  return <Icon className={className} />;
}

export default function ModuleFeaturePage(props: { params: { moduleId: string } }) {
  const { moduleId } = props.params;
  const firestore = useFirestore();
  const { user } = useUser();

  const isSignedIn = Boolean(user && !user.isAnonymous);

  const userProfileRef = useMemoFirebase(
    () => (user?.uid && !user.isAnonymous ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid, user?.isAnonymous]
  );
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const { limits, allItems } = useMarketplaceCatalog({ includeInactive: true });

  const [billingCycle, setBillingCycle] = useState<MarketplaceBillingCycle>("monthly");
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoPhone, setDemoPhone] = useState("");
  const [demoNotes, setDemoNotes] = useState("");

  const suiteSummary = useMemo(
    () => allItems.find((b) => b.id === moduleId),
    [allItems, moduleId]
  );
  const detail = useMemo(() => {
    const registered = getModuleDetail(moduleId);
    if (registered && suiteSummary) {
      const overrideFeatures = suiteSummary.inclusions
        ? suiteSummary.inclusions
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      return {
        ...registered,
        title: suiteSummary.name || registered.title,
        description: suiteSummary.description || registered.description,
        features: overrideFeatures.length > 0 ? overrideFeatures : registered.features,
        rules: suiteSummary.usageLimit
          ? [`Configured Quota: ${suiteSummary.usageLimit}`, ...registered.rules]
          : registered.rules,
      };
    }
    if (registered) return registered;
    if (suiteSummary) return buildIndividualModuleDetail(suiteSummary);
    return undefined;
  }, [moduleId, suiteSummary]);
  const meta = MARKETPLACE_META[moduleId];
  const workspace = getItemWorkspaceLink(moduleId);

  const activeAddonIds: string[] = Array.isArray(business?.activeAddonIds)
    ? business.activeAddonIds
    : [];
  const isActive = activeAddonIds.includes(moduleId);

  const currencySymbol = getCurrencySymbol(business?.currency || "INR");
  const discountPercent = suiteSummary?.annualDiscountPercent ?? limits.annualDiscountPercent;
  const trialDays = suiteSummary?.trialDays ?? limits.trialDurationDays;
  const pricing = suiteSummary
    ? calculateMarketplacePrice(suiteSummary.price, billingCycle, discountPercent)
    : null;

  const handleActivate = () => {
    if (!isSignedIn) {
      toast({
        title: "Sign in required",
        description: "Please sign in to your business account to activate this suite.",
      });
      return;
    }
    if (!businessRef) return;
    if (activeAddonIds.includes(moduleId)) return;

    updateDocumentNonBlocking(businessRef, {
      activeAddonIds: [...activeAddonIds, moduleId],
      updatedAt: new Date().toISOString(),
    });

    toast({
      title: `${detail?.title || "Suite"} Trial Started`,
      description: "Your 14-day free trial is now unlocked in the sidebar.",
    });
  };

  const handleDeactivate = () => {
    if (!isSignedIn || !businessRef) return;
    updateDocumentNonBlocking(businessRef, {
      activeAddonIds: activeAddonIds.filter((id) => id !== moduleId),
      updatedAt: new Date().toISOString(),
    });
    toast({
      title: `${detail?.title || "Suite"} Disabled`,
      description: "Removed from your active plan. Your saved records remain intact.",
    });
  };

  const handleSubmitDemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoPhone.trim()) {
      toast({ title: "Phone number needed", description: "Please enter a contact number." });
      return;
    }
    setDemoModalOpen(false);
    setDemoPhone("");
    setDemoNotes("");
    toast({
      title: "Walkthrough Requested",
      description: "Our onboarding team will reach out shortly with a guided setup.",
    });
  };

  if (!detail) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <ShieldAlert className="h-10 w-10 text-rose-600" />
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900">Module not found</h1>
          <p className="text-sm text-slate-600">
            This suite may have moved or been renamed in the Marketplace.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/marketplace">Back to Marketplace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 text-left px-2 sm:px-4">
      {/* Breadcrumb Back Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            asChild
            variant="outline"
            size="icon"
            aria-label="Back to Marketplace"
            className="h-10 w-10 rounded-xl bg-white border-slate-200 shrink-0"
          >
            <Link href="/marketplace">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">
              Marketplace / Suite Details
            </p>
            <h1 className="text-xl sm:text-3xl font-bold text-slate-900 truncate">
              {detail.title}
            </h1>
          </div>
        </div>

        {isActive && (
          <Button asChild className="rounded-xl font-semibold text-xs shrink-0">
            <Link href={workspace.href}>
              {workspace.label}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8 min-w-0">
          {/* Overview Banner */}
          <div className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <DynamicIcon name={suiteSummary?.icon || "Zap"} className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">{detail.logicTitle}</p>
                <h2 className="text-lg font-bold text-white">{detail.title}</h2>
              </div>
            </div>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              {meta?.bestFor && !detail.description.startsWith(meta.bestFor)
                ? `${meta.bestFor}. `
                : ""}
              {detail.description}
            </p>
          </div>

          {/* Core Modules Inside Suite */}
          {"sections" in detail && Array.isArray(detail.sections) && detail.sections.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Tools Included in This Suite</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {detail.sections.map((sec, i) => (
                  <div
                    key={i}
                    className="p-5 bg-white rounded-2xl border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <DynamicIcon name={sec.icon} className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{sec.title}</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{sec.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Key Capabilities */}
          {detail.features && (
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Key Capabilities</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {detail.features.map((feat, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-800">{feat}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Business Rules & Safeguards */}
          <section className="p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 space-y-5">
            <h3 className="text-lg font-bold text-slate-900">How It Works & Built-in Safeguards</h3>
            <div className="space-y-4">
              {detail.rules.map((rule, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 tabular-nums">
                    {i + 1}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed pt-0.5">{rule}</p>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">{detail.backend}</p>
            </div>
          </section>
        </div>

        {/* Sticky Activation Sidebar (desktop only) */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24 min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
            {pricing && (
              <div className="space-y-3">
                <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1 w-full">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors",
                      billingCycle === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("yearly")}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors",
                      billingCycle === "yearly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                    )}
                  >
                    Annual (-{discountPercent}%)
                  </button>
                </div>

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900 tabular-nums">
                      {currencySymbol}
                      {pricing.effectiveMonthly.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500">/ month</span>
                  </div>
                  {billingCycle === "yearly" && (
                    <p className="text-xs text-emerald-700 font-medium mt-0.5 tabular-nums">
                      Billed {currencySymbol}
                      {pricing.yearlyTotal.toLocaleString()}/year
                    </p>
                  )}
                  {suiteSummary?.usageLimit && (
                    <p className="text-xs font-medium text-primary mt-1.5">
                      {suiteSummary.usageLimit}
                    </p>
                  )}
                </div>
              </div>
            )}

            {isActive ? (
              <div className="space-y-2.5">
                <Button asChild className="w-full h-11 rounded-xl font-semibold text-sm">
                  <Link href={workspace.href}>
                    {workspace.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDeactivate}
                  className="w-full h-10 rounded-xl text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <Power className="mr-1.5 h-3.5 w-3.5" /> Turn Off Suite
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleActivate}
                className="w-full h-11 rounded-xl font-semibold text-sm"
              >
                {suiteSummary?.isTrialAvailable === false
                  ? "Activate Now"
                  : `Start ${trialDays}-Day Free Trial`}
              </Button>
            )}

            <ul className="space-y-2.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                Zero setup fee — ready immediately
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                Instant sidebar access after activation
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                Cancel or switch plans anytime
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Need a quick walkthrough?</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Have questions about how {detail.title} fits your business workflow? Request a 15-minute live setup call.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDemoModalOpen(true)}
              className="w-full h-10 rounded-xl text-xs font-semibold border-slate-200"
            >
              Request Guided Demo
            </Button>
          </div>
        </div>
      </div>

      {/* Interactive Demo Request Modal */}
      <Dialog open={demoModalOpen} onOpenChange={setDemoModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleSubmitDemo} className="space-y-4">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-bold text-slate-900">
                Request {detail.title} Demo
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                Share your WhatsApp or phone number and our team will help configure this suite for you.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-left">
              <div className="space-y-1.5">
                <Label htmlFor="demo-phone" className="text-xs font-semibold text-slate-700">
                  Phone / WhatsApp Number
                </Label>
                <Input
                  id="demo-phone"
                  value={demoPhone}
                  onChange={(e) => setDemoPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="demo-notes" className="text-xs font-semibold text-slate-700">
                  What would you like help with? (Optional)
                </Label>
                <Input
                  id="demo-notes"
                  value={demoNotes}
                  onChange={(e) => setDemoNotes(e.target.value)}
                  placeholder="e.g. Importing staff or WhatsApp template setup"
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDemoModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl">
                Send Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
