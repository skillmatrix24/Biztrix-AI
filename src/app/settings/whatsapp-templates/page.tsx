"use client";

import { useState, useEffect } from "react";
import { 
  SmartphoneNfc, 
  Plus, 
  ArrowLeft, 
  RefreshCcw, 
  LayoutList, 
  Palette, 
  Bot, 
  SearchCode,
  Sparkles,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Modular Components
import { TemplateRegistry } from "./components/TemplateRegistry";
import { TemplateBlueprints } from "./components/TemplateBlueprints";
import { VisualDesigner } from "./components/VisualDesigner";

// Actions
import { listWhatsAppTemplates, createWhatsAppTemplate, deleteWhatsAppTemplate } from "@/app/actions/whatsapp-actions";

export default function WhatsAppTemplatesPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("registry");

  // Designer State
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
    bodyVariablesSamples: {} as Record<string, string>
  });

  const waConfig = business?.whatsappApiConfig;

  const fetchTemplates = async () => {
    // Hardened: No longer checking for config.accessToken on client
    if (!waConfig?.wabaId || !businessId) return;
    setIsLoading(true);
    try {
      const result = await listWhatsAppTemplates(businessId, { 
        wabaId: waConfig.wabaId
      });
      if (result.success) setTemplates(result.templates || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (waConfig?.isVerified) fetchTemplates();
  }, [waConfig?.isVerified]);

  const handleCreateFromDesign = async () => {
    if (!designData.name || !designData.body || !waConfig || !businessId) {
      toast({ variant: "destructive", title: "Form Incomplete" });
      return;
    }
    
    setIsLoading(true);

    try {
      // 1. Build Meta-Compliant Components
      const components: any[] = [];

      // A. HEADER NODE
      if (designData.headerType !== 'NONE') {
        const header: any = {
          type: "HEADER",
          format: designData.headerType
        };

        if (designData.headerType === 'TEXT') {
          header.text = designData.headerText;
          // Simple variable detection for samples
          const hVars = designData.headerText.match(/\{\{\d+\}\}/g) || [];
          if (hVars.length > 0) {
            header.example = {
              header_text: hVars.map((v: string) => designData.headerVariablesSamples[v] || "Sample")
            };
          }
        } else {
          // Media headers require example handle for API submission
          header.example = {
            header_handle: ["https://picsum.photos/seed/wa/600/400"]
          };
        }
        components.push(header);
      }

      // B. BODY NODE (Mandatory)
      const body: any = {
        type: "BODY",
        text: designData.body
      };
      const bVars = designData.body.match(/\{\{\d+\}\}/g) || [];
      if (bVars.length > 0) {
        body.example = {
          body_text: [bVars.map((v: string) => designData.bodyVariablesSamples[v] || "Sample")]
        };
      }
      components.push(body);

      // C. FOOTER NODE
      if (designData.footer) {
        components.push({
          type: "FOOTER",
          text: designData.footer
        });
      }

      // D. BUTTONS NODE
      if (designData.buttons && designData.buttons.length > 0) {
        const buttons = designData.buttons.map((btn: any) => {
          if (btn.type === 'QUICK_REPLY') {
            return { type: 'QUICK_REPLY', text: btn.label };
          } else if (btn.type === 'URL') {
            return { type: 'URL', text: btn.label, url: btn.value || "https://biztrix.in" };
          } else if (btn.type === 'PHONE_NUMBER') {
            return { type: 'PHONE_NUMBER', text: btn.label, phone_number: btn.value || "919876543210" };
          }
          return null;
        }).filter(Boolean);

        if (buttons.length > 0) {
          components.push({
            type: "BUTTONS",
            buttons
          });
        }
      }

      // 2. Dispatch to Server Action
      // Hardened: No longer passing accessToken from browser
      const result = await createWhatsAppTemplate(
        businessId,
        { wabaId: waConfig.wabaId }, 
        { 
          name: designData.name, 
          category: designData.category, 
          language: designData.language, 
          components 
        }
      );

      if (result.success) {
        toast({ title: "Node Deployed", description: "Template submitted for Meta approval." });
        setActiveTab("registry");
        fetchTemplates();
      } else {
        toast({ 
          variant: "destructive", 
          title: "Deployment Error", 
          description: result.error || "Meta rejected parameters." 
        });
      }
    } catch (e: any) {
    console.error(e);
      toast({ 
        variant: "destructive", 
        title: "Runtime Error", 
        description: e.message || "Failed to initiate handshake." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplateAction = async (n: string) => {
      if(!businessId || !waConfig) return;
      // Hardened: No longer passing accessToken
      const res = await deleteWhatsAppTemplate(businessId, { wabaId: waConfig.wabaId }, n);
      if(res.success) fetchTemplates();
      else toast({ variant: "destructive", title: "Error", description: res.error });
  }

  return (
    <div className="space-y-6 md:space-y-10 pb-20 px-2 sm:px-0 text-left">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border shrink-0"><Link href="/whatsapp-automation"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Template Hub</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Meta Cloud Node Designer v3.5</p>
          </div>
        </div>
        <div className="flex gap-2">
           {waConfig?.isVerified && (
             <Button variant="outline" onClick={fetchTemplates} disabled={isLoading} className="h-10 px-4 rounded-xl font-bold text-[10px] uppercase gap-2 bg-white border-primary/20 text-primary">
                <RefreshCcw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} /> Sync Meta Registry
             </Button>
           )}
           <Button onClick={() => setActiveTab("designer")} className="bg-primary hover:bg-primary/90 shadow-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
             <Plus className="mr-2 h-4 w-4" /> New Advanced Node
           </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border h-14 p-1.5 rounded-2xl shadow-sm mb-10 flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="registry" className="flex-1 text-[9px] md:text-[10px] font-black uppercase px-6 gap-2 whitespace-nowrap"><LayoutList className="h-4 w-4" /> My Registry</TabsTrigger>
          <TabsTrigger value="blueprints" className="flex-1 text-[9px] md:text-[10px] font-black uppercase px-6 gap-2 text-primary whitespace-nowrap"><Sparkles className="h-4 w-4" /> AI Blueprints Lab</TabsTrigger>
          <TabsTrigger value="designer" className="flex-1 text-[9px] md:text-[10px] font-black uppercase px-6 gap-2 text-slate-900 whitespace-nowrap"><Palette className="h-3.5 w-3.5" /> Visual Designer</TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="m-0">
          <TemplateRegistry isLoading={isLoading} templates={templates} onDelete={handleDeleteTemplateAction} />
        </TabsContent>

        <TabsContent value="blueprints" className="m-0">
          <TemplateBlueprints 
            business={business}
            onUse={(bp: any) => { setDesignData({ ...designData, name: bp.name || "", body: bp.body }); setActiveTab("designer"); }} 
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
