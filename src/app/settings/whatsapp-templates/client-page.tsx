"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  RefreshCcw,
  LayoutList,
  Palette,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/editorial";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { TemplateRegistry } from "./components/TemplateRegistry";
import { TemplateBlueprints } from "./components/TemplateBlueprints";
import { VisualDesigner } from "./components/VisualDesigner";

import {
  listWhatsAppTemplates,
  createWhatsAppTemplate,
  deleteWhatsAppTemplate,
} from "@/app/actions/whatsapp-actions";

export default function WhatsAppTemplatesPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, "users", user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(
    () => (businessId ? doc(firestore, "businesses", businessId) : null),
    [firestore, businessId]
  );
  const { data: business } = useDoc<any>(businessRef);

  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("registry");

  const [designData, setDesignData] = useState({
    name: "",
    category: "MARKETING" as any,
    language: "en_US",
    headerType: "NONE" as "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT",
    headerText: "",
    headerImage: "",
    headerVideo: "",
    headerDocument: "",
    body: "Namaste {{1}}! Welcome to our store. Check your points here: {{2}}",
    footer: "Reply STOP to unsubscribe.",
    buttons: [] as any[],
    headerVariablesSamples: {} as Record<string, string>,
    bodyVariablesSamples: {} as Record<string, string>,
  });

  const waConfig = business?.whatsappApiConfig;

  const fetchTemplates = useCallback(async () => {
    if (!waConfig?.wabaId || !businessId) return;
    setIsLoading(true);
    try {
      const result = await listWhatsAppTemplates(businessId, {
        wabaId: waConfig.wabaId,
      });
      if (result.success) setTemplates(result.templates || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [waConfig?.wabaId, businessId]);

  useEffect(() => {
    if (waConfig?.isVerified) fetchTemplates();
  }, [waConfig?.isVerified, fetchTemplates]);

  const handleCreateFromDesign = async () => {
    if (!designData.name || !designData.body || !waConfig || !businessId) {
      toast({ variant: "destructive", title: "Form incomplete", description: "Please enter a template name and body." });
      return;
    }

    setIsLoading(true);

    try {
      const components: any[] = [];

      if (designData.headerType !== "NONE") {
        const header: any = {
          type: "HEADER",
          format: designData.headerType,
        };

        if (designData.headerType === "TEXT") {
          header.text = designData.headerText;
          const hVars = designData.headerText.match(/\{\{\d+\}\}/g) || [];
          if (hVars.length > 0) {
            header.example = {
              header_text: hVars.map(
                (v: string) => designData.headerVariablesSamples[v] || "Sample"
              ),
            };
          }
        } else {
          header.example = {
            header_handle: ["https://biztrix.in/assets/whatsapp-sample.png"],
          };
        }
        components.push(header);
      }

      const body: any = {
        type: "BODY",
        text: designData.body,
      };
      const bVars = designData.body.match(/\{\{\d+\}\}/g) || [];
      if (bVars.length > 0) {
        body.example = {
          body_text: [
            bVars.map(
              (v: string) => designData.bodyVariablesSamples[v] || "Sample"
            ),
          ],
        };
      }
      components.push(body);

      if (designData.footer) {
        components.push({
          type: "FOOTER",
          text: designData.footer,
        });
      }

      if (designData.buttons && designData.buttons.length > 0) {
        const buttons = designData.buttons
          .map((btn: any) => {
            if (btn.type === "QUICK_REPLY") {
              return { type: "QUICK_REPLY", text: btn.label };
            } else if (btn.type === "URL") {
              return {
                type: "URL",
                text: btn.label,
                url: btn.value || "https://biztrix.in",
              };
            } else if (btn.type === "PHONE_NUMBER") {
              return {
                type: "PHONE_NUMBER",
                text: btn.label,
                phone_number: btn.value || "919876543210",
              };
            }
            return null;
          })
          .filter(Boolean);

        if (buttons.length > 0) {
          components.push({
            type: "BUTTONS",
            buttons,
          });
        }
      }

      const result = await createWhatsAppTemplate(
        businessId,
        { wabaId: waConfig.wabaId },
        {
          name: designData.name,
          category: designData.category,
          language: designData.language,
          components,
        }
      );

      if (result.success) {
        toast({
          title: "Template Submitted",
          description: "Template submitted for Meta approval.",
        });
        setActiveTab("registry");
        fetchTemplates();
      } else {
        toast({
          variant: "destructive",
          title: "Submission Error",
          description: result.error || "Meta rejected template parameters.",
        });
      }
    } catch (e: any) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Runtime Error",
        description: e.message || "Failed to submit template.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplateAction = async (n: string) => {
    if (!businessId || !waConfig) return;
    const res = await deleteWhatsAppTemplate(
      businessId,
      { wabaId: waConfig.wabaId },
      n
    );
    if (res.success) fetchTemplates();
    else
      toast({
        variant: "destructive",
        title: "Error",
        description: res.error,
      });
  };

  return (
    <div className="space-y-6 pb-20 text-left">
      <PageHeader
        breadcrumb="WhatsApp Automation"
        title="Template Hub"
        description="Design, test, and submit Meta Cloud message templates."
        backHref="/whatsapp-automation"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {waConfig?.isVerified && (
              <Button
                variant="outline"
                onClick={fetchTemplates}
                disabled={isLoading}
                className="h-9 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700"
              >
                <RefreshCcw
                  className={cn("mr-1.5 h-3.5 w-3.5", isLoading && "animate-spin")}
                />
                Sync Meta Registry
              </Button>
            )}
            <Button
              onClick={() => setActiveTab("designer")}
              className="h-9 rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Plus className="mr-1.5 h-4 w-4" /> New Template
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 scrollbar-hide sm:w-fit">
          <TabsTrigger
            value="registry"
            className="gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <LayoutList className="h-3.5 w-3.5" /> My Registry
          </TabsTrigger>
          <TabsTrigger
            value="blueprints"
            className="gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <Sparkles className="h-3.5 w-3.5" /> AI Blueprints Lab
          </TabsTrigger>
          <TabsTrigger
            value="designer"
            className="gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <Palette className="h-3.5 w-3.5" /> Visual Designer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="m-0">
          <TemplateRegistry
            isLoading={isLoading}
            templates={templates}
            onDelete={handleDeleteTemplateAction}
          />
        </TabsContent>

        <TabsContent value="blueprints" className="m-0">
          <TemplateBlueprints
            business={business}
            onUse={(bp: any) => {
              setDesignData({
                ...designData,
                name: bp.name || "",
                body: bp.body,
              });
              setActiveTab("designer");
            }}
          />
        </TabsContent>

        <TabsContent value="designer" className="m-0">
          <VisualDesigner
            designData={designData}
            setDesignData={setDesignData}
            isSubmitting={isLoading}
            waConfig={waConfig}
            onDeploy={handleCreateFromDesign}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
