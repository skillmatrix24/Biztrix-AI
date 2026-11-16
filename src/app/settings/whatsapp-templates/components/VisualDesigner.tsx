"use client";

import React, { useMemo } from "react";
import {
  Palette,
  PlusCircle,
  Image as ImageLucide,
  Video,
  File as FileIcon,
  FileText,
  X,
  MousePointer2,
  Sparkles,
  Upload,
  Loader2,
  ShieldCheck,
  History as HistoryIcon,
  BookOpen,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MobilePreview } from "./MobilePreview";

const VARIABLE_PROTOCOL = [
  { id: "{{1}}", label: "Customer Name" },
  { id: "{{2}}", label: "ID / Identifier" },
  { id: "{{3}}", label: "Value / Reward" },
  { id: "{{4}}", label: "Tracking URL" },
];

interface VisualDesignerProps {
  designData: any;
  setDesignData: (data: any) => void;
  isSubmitting: boolean;
  waConfig: any;
  onDeploy: () => void;
}

export function VisualDesigner({
  designData,
  setDesignData,
  isSubmitting,
  waConfig,
  onDeploy,
}: VisualDesignerProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const detectVariables = (text: string) => {
    const matches = text.match(/\{\{\d+\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches)).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""));
      const numB = parseInt(b.replace(/\D/g, ""));
      return numA - numB;
    });
  };

  const headerVariables = useMemo(
    () => detectVariables(designData.headerText || ""),
    [designData.headerText]
  );
  const bodyVariables = useMemo(
    () => detectVariables(designData.body || ""),
    [designData.body]
  );

  const approvalProbability = useMemo(() => {
    let score = 15;
    if (designData.name?.length > 3) score += 15;
    if (designData.body?.length > 20) score += 20;

    const allVars = [...headerVariables, ...bodyVariables];
    const samplesCount = Object.keys({
      ...designData.headerVariablesSamples,
      ...designData.bodyVariablesSamples,
    }).length;

    if (allVars.length > 0) {
      if (samplesCount === allVars.length) score += 30;
      else if (samplesCount > 0) score += 10;
    } else {
      score += 30;
    }

    if (designData.footer) score += 10;
    if (designData.buttons?.length > 0) score += 10;

    return Math.min(score, 100);
  }, [designData, headerVariables, bodyVariables]);

  const insertVariable = (target: "body" | "header") => {
    const hVars = detectVariables(designData.headerText || "");
    const bVars = detectVariables(designData.body || "");
    const allVars = Array.from(new Set([...hVars, ...bVars]));

    const nums = allVars
      .map((v) => parseInt(v.replace(/\D/g, "")))
      .filter((n) => !isNaN(n));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;

    if (target === "body") {
      setDesignData({
        ...designData,
        body: (designData.body || "") + ` {{${nextNum}}}`,
      });
    } else {
      setDesignData({
        ...designData,
        headerText: (designData.headerText || "") + ` {{${nextNum}}}`,
      });
    }
  };

  const updateSample = (v: string, value: string, isHeader: boolean) => {
    if (isHeader) {
      setDesignData({
        ...designData,
        headerVariablesSamples: {
          ...designData.headerVariablesSamples,
          [v]: value,
        },
      });
    } else {
      setDesignData({
        ...designData,
        bodyVariablesSamples: {
          ...designData.bodyVariablesSamples,
          [v]: value,
        },
      });
    }
  };

  const addDesignButton = () => {
    if (designData.buttons?.length >= 10) return;
    const newBtn = {
      id: `btn_${Date.now()}`,
      type: "QUICK_REPLY",
      label: "Action Label",
    };
    setDesignData({
      ...designData,
      buttons: [...(designData.buttons || []), newBtn],
    });
  };

  const renderPreviewText = (
    text: string,
    samples: Record<string, string>
  ) => {
    let result = text || "";
    Object.entries(samples).forEach(([v, val]) => {
      result = result.replace(new RegExp(`\\${v}`, "g"), val || v);
    });
    return result;
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Card className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white lg:h-[780px]">
          <CardHeader className="flex shrink-0 flex-row items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Meta Template Designer
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Configure header, body variables, footer, and action buttons
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] font-medium text-slate-500">
                Readiness
              </span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-500"
                    style={{ width: `${approvalProbability}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-semibold tabular-nums text-emerald-700">
                  {approvalProbability}%
                </span>
              </div>
            </div>
          </CardHeader>

          <ScrollArea className="flex-1">
            <CardContent className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-semibold text-slate-700">
                    Template Name (Slug) *
                  </Label>
                  <Input
                    value={designData.name}
                    onChange={(e) =>
                      setDesignData({
                        ...designData,
                        name: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                      })
                    }
                    placeholder="e.g. festive_offer"
                    className="h-10 rounded-xl border-slate-200 bg-white font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-semibold text-slate-700">
                    Meta Category
                  </Label>
                  <Select
                    value={designData.category}
                    onValueChange={(v: any) =>
                      setDesignData({ ...designData, category: v })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MARKETING" className="text-xs font-medium">
                        Marketing
                      </SelectItem>
                      <SelectItem value="UTILITY" className="text-xs font-medium">
                        Utility
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-semibold text-slate-700">
                    Language
                  </Label>
                  <Select
                    value={designData.language}
                    onValueChange={(v) =>
                      setDesignData({ ...designData, language: v })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_US" className="text-xs font-medium">
                        English (US)
                      </SelectItem>
                      <SelectItem value="hi_IN" className="text-xs font-medium">
                        Hindi
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Variable Reference */}
              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <BookOpen className="h-3.5 w-3.5 text-emerald-400" /> Mapping Protocol Reference
                </p>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {VARIABLE_PROTOCOL.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-left"
                    >
                      <p className="font-mono text-xs font-semibold text-emerald-400">
                        {v.id}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-300">
                        {v.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Header Configuration */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-left">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <ImageLucide className="h-4 w-4 text-slate-600" />
                    <Label className="text-xs font-semibold text-slate-900">
                      Message Header Type
                    </Label>
                  </div>
                  <Select
                    value={designData.headerType}
                    onValueChange={(v: any) =>
                      setDesignData({
                        ...designData,
                        headerType: v,
                        headerText: "",
                        headerImage: "",
                      })
                    }
                  >
                    <SelectTrigger className="h-9 w-40 rounded-xl border-slate-200 bg-white text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE" className="text-xs">No Header</SelectItem>
                      <SelectItem value="TEXT" className="text-xs">Text Headline</SelectItem>
                      <SelectItem value="IMAGE" className="text-xs">Rich Image</SelectItem>
                      <SelectItem value="VIDEO" className="text-xs">Video Content</SelectItem>
                      <SelectItem value="DOCUMENT" className="text-xs">PDF Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {designData.headerType === "TEXT" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-slate-600">
                        Headline Content
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-lg text-xs"
                        onClick={() => insertVariable("header")}
                      >
                        + Add Variable
                      </Button>
                    </div>
                    <Input
                      value={designData.headerText}
                      onChange={(e) =>
                        setDesignData({
                          ...designData,
                          headerText: e.target.value,
                        })
                      }
                      placeholder="e.g. Welcome to {{1}}!"
                      className="h-10 rounded-xl border-slate-200 bg-white text-sm font-medium"
                    />
                  </div>
                )}

                {(designData.headerType === "IMAGE" ||
                  designData.headerType === "VIDEO" ||
                  designData.headerType === "DOCUMENT") && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "flex h-36 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white transition-colors hover:border-slate-400",
                        designData.headerImage && "border-slate-300 p-0"
                      )}
                    >
                      {designData.headerImage ? (
                        designData.headerType === "IMAGE" ? (
                          <img
                            src={designData.headerImage}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                            alt="Selected header"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1.5">
                            {designData.headerType === "VIDEO" ? (
                              <Video className="h-7 w-7 text-slate-700" />
                            ) : (
                              <FileIcon className="h-7 w-7 text-slate-700" />
                            )}
                            <span className="text-xs font-medium text-slate-700">
                              Media Loaded
                            </span>
                          </div>
                        )
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-slate-400" />
                          <span className="text-xs font-medium text-slate-600">
                            Click to upload {designData.headerType.toLowerCase()}
                          </span>
                        </>
                      )}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept={
                        designData.headerType === "IMAGE"
                          ? "image/*"
                          : designData.headerType === "VIDEO"
                          ? "video/*"
                          : ".pdf"
                      }
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () =>
                            setDesignData({
                              ...designData,
                              headerImage: reader.result as string,
                            });
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Body Text */}
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-600" />
                    <Label className="text-xs font-semibold text-slate-700">
                      Template Body *
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 rounded-lg border-slate-200 bg-white text-xs"
                    onClick={() => insertVariable("body")}
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Insert Variable
                  </Button>
                </div>
                <Textarea
                  value={designData.body}
                  onChange={(e) =>
                    setDesignData({ ...designData, body: e.target.value })
                  }
                  placeholder="Hi {{1}}, thank you for choosing {{2}}!"
                  className="min-h-[140px] rounded-xl border-slate-200 bg-white p-4 text-sm leading-relaxed"
                />
              </div>

              {/* Sample Content */}
              {(headerVariables.length > 0 || bodyVariables.length > 0) && (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-slate-700" />
                    <h5 className="text-xs font-semibold text-slate-900">
                      Variable Sample Values (Required for Approval)
                    </h5>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {headerVariables.map((v) => (
                      <div key={v} className="space-y-1">
                        <Label className="text-xs text-slate-600">
                          Header Example{" "}
                          <span className="font-mono font-semibold">{v}</span>
                        </Label>
                        <Input
                          value={designData.headerVariablesSamples[v] || ""}
                          onChange={(e) => updateSample(v, e.target.value, true)}
                          placeholder="Sample value"
                          className="h-9 rounded-lg border-slate-200 bg-white text-xs"
                        />
                      </div>
                    ))}
                    {bodyVariables.map((v) => (
                      <div key={v} className="space-y-1">
                        <Label className="text-xs text-slate-600">
                          Body Example{" "}
                          <span className="font-mono font-semibold">{v}</span>
                        </Label>
                        <Input
                          value={designData.bodyVariablesSamples[v] || ""}
                          onChange={(e) =>
                            updateSample(v, e.target.value, false)
                          }
                          placeholder="Sample value"
                          className="h-9 rounded-lg border-slate-200 bg-white text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer & Buttons */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2 text-left">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <HistoryIcon className="h-3.5 w-3.5 text-slate-500" /> Footer (Optional)
                  </Label>
                  <Input
                    value={designData.footer}
                    onChange={(e) =>
                      setDesignData({ ...designData, footer: e.target.value })
                    }
                    placeholder="e.g. Reply STOP to unsubscribe"
                    className="h-10 rounded-xl border-slate-200 bg-white text-xs"
                  />
                </div>

                <div className="space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <MousePointer2 className="h-3.5 w-3.5 text-slate-500" /> Action Buttons
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-lg text-xs"
                      onClick={addDesignButton}
                    >
                      + Add Button
                    </Button>
                  </div>
                  <div className="space-y-2.5">
                    {(designData.buttons || []).map((btn: any) => (
                      <div
                        key={btn.id}
                        className="relative space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={btn.type}
                            onValueChange={(v: any) =>
                              setDesignData({
                                ...designData,
                                buttons: designData.buttons.map((b: any) =>
                                  b.id === btn.id ? { ...b, type: v } : b
                                ),
                              })
                            }
                          >
                            <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="QUICK_REPLY" className="text-xs">
                                Quick Reply
                              </SelectItem>
                              <SelectItem value="URL" className="text-xs">
                                Website Link
                              </SelectItem>
                              <SelectItem value="PHONE_NUMBER" className="text-xs">
                                Phone Call
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Label"
                            value={btn.label}
                            onChange={(e) =>
                              setDesignData({
                                ...designData,
                                buttons: designData.buttons.map((b: any) =>
                                  b.id === btn.id
                                    ? { ...b, label: e.target.value }
                                    : b
                                ),
                              })
                            }
                            className="h-9 rounded-lg border-slate-200 bg-white text-xs"
                          />
                        </div>
                        {btn.type !== "QUICK_REPLY" && (
                          <Input
                            placeholder={
                              btn.type === "URL" ? "https://..." : "91XXXXXXXX"
                            }
                            value={btn.value || ""}
                            onChange={(e) =>
                              setDesignData({
                                ...designData,
                                buttons: designData.buttons.map((b: any) =>
                                  b.id === btn.id
                                    ? { ...b, value: e.target.value }
                                    : b
                                ),
                              })
                            }
                            className="h-9 rounded-lg border-slate-200 bg-white font-mono text-xs"
                          />
                        )}
                        <button
                          type="button"
                          aria-label="Remove action button"
                          onClick={() =>
                            setDesignData({
                              ...designData,
                              buttons: designData.buttons.filter(
                                (b: any) => b.id !== btn.id
                              ),
                            })
                          }
                          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-red-600 hover:bg-red-50"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </ScrollArea>

          <CardFooter className="shrink-0 border-t border-slate-100 bg-slate-50/70 p-5">
            <Button
              onClick={onDeploy}
              disabled={isSubmitting || !waConfig?.isVerified}
              className="h-11 w-full rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              Submit Template to Meta Cloud API
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="lg:sticky lg:top-24 lg:col-span-5">
        <MobilePreview
          designData={designData}
          renderPreviewText={renderPreviewText}
        />
      </div>
    </div>
  );
}
