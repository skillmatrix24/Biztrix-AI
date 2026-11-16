"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "@/components/ui/editorial";
import { updateDocumentNonBlocking } from "@/firebase";
import { toast } from "@/hooks/use-toast";

export function BannerTab({
  business,
  businessRef,
  isAdmin,
}: {
  business: any;
  businessRef: any;
  isAdmin: boolean;
}) {
  const [bannerConfig, setBannerConfig] = useState({
    isEnabled: business?.bannerConfig?.isEnabled ?? false,
    message:
      business?.bannerConfig?.message ?? "Website under active development.",
  });

  useEffect(() => {
    if (business?.bannerConfig) {
      setBannerConfig({
        isEnabled: business.bannerConfig.isEnabled ?? false,
        message:
          business.bannerConfig.message ?? "Website under active development.",
      });
    }
  }, [business?.bannerConfig]);

  const handleSave = () => {
    if (!isAdmin || !businessRef) return;
    updateDocumentNonBlocking(businessRef, { bannerConfig });
    toast({ title: "Banner Config Saved" });
  };

  return (
    <div className="max-w-3xl text-left">
      <SectionCard
        title="Notification Banner"
        description="Display a site-wide announcement strip across your workspace or storefront."
        headerRight={<AlertTriangle className="h-4 w-4 text-slate-500" />}
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-0.5">
              <Label htmlFor="banner-enable-switch" className="text-xs font-semibold text-slate-900">
                Enable Banner
              </Label>
              <p className="text-xs text-slate-500">
                Toggle visibility of the top notification strip.
              </p>
            </div>
            <Switch
              id="banner-enable-switch"
              disabled={!isAdmin}
              checked={bannerConfig.isEnabled ?? false}
              onCheckedChange={(checked) =>
                setBannerConfig({ ...bannerConfig, isEnabled: checked })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="banner-message" className="text-xs font-semibold text-slate-700">
              Banner Message
            </Label>
            <Input
              id="banner-message"
              disabled={!isAdmin}
              value={bannerConfig?.message ?? ""}
              onChange={(e) =>
                setBannerConfig({ ...bannerConfig, message: e.target.value })
              }
              placeholder="Enter banner message..."
              className="h-11 rounded-xl bg-white border-slate-200 text-sm"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={!isAdmin}
              onClick={handleSave}
              className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
            >
              <Save className="mr-2 h-3.5 w-3.5" />
              Save Banner Settings
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
