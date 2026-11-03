
"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  ChevronLeft, 
  Save, 
  Eye, 
  Plus, 
  GripVertical, 
  Trash2, 
  Settings2,
  Layout,
  Image as ImageIcon,
  Type,
  ShoppingCart,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  Monitor,
  Smartphone,
  Check,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription
} from "@/components/ui/sheet";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase, setDocumentNonBlocking, useCollection } from "@/firebase";
import { doc, serverTimestamp, collection } from "firebase/firestore";

type SectionType = "hero" | "about" | "products" | "contact" | "whatsapp";

type Section = {
  id: string;
  type: SectionType;
  content: any;
};

export default function PageEditor() {
  const firestore = useFirestore();
  const { user } = useUser();

  // 1. Resolve Profile & Business Context
  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  // 2. Reference the Main Website Document
  const websiteRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId, 'websites', 'main') : null
  , [firestore, businessId]);
  const { data: websiteData, isLoading: isWebsiteLoading } = useDoc<any>(websiteRef);

  // 2.1 Fetch Real-time Catalog
  const productsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'products') : null
  , [firestore, businessId]);
  const { data: dbProducts } = useCollection<any>(productsQuery);

  const [sections, setSections] = useState<Section[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"node" | "theme">("node");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);

  // 3. Load Existing Sections on Mount
  useEffect(() => {
    if (websiteData?.sections && !hasInitialLoaded) {
      setSections(websiteData.sections);
      setHasInitialLoaded(true);
      if (websiteData.sections.length > 0) {
        setActiveSectionId(websiteData.sections[0].id);
      }
    }
  }, [websiteData, hasInitialLoaded]);

  // 4. Persistence Layer Helper
  const persistSections = (updatedSections: Section[]) => {
    if (!websiteRef || !businessId) return;
    setDocumentNonBlocking(websiteRef, { 
      sections: updatedSections,
      updatedAt: serverTimestamp() 
    }, { merge: true });
  };

  const updateActiveSectionContent = (key: string, value: any) => {
    if (!activeSectionId) return;
    const updated = sections.map(s => 
      s.id === activeSectionId ? { ...s, content: { ...s.content, [key]: value } } : s
    );
    setSections(updated);
    persistSections(updated);
  };

  const moveSection = (id: string, dir: "up" | "down") => {
    const idx = sections.findIndex(s => s.id === id);
    if ((dir === "up" && idx === 0) || (dir === "down" && idx === sections.length - 1)) return;
    const newSections = [...sections];
    const item = newSections.splice(idx, 1)[0];
    newSections.splice(dir === "up" ? idx - 1 : idx + 1, 0, item);
    setSections(newSections);
    persistSections(newSections);
  };

  const addSection = (type: SectionType) => {
    const contentMap: Record<SectionType, any> = {
      hero: { title: "New Heading", subtitle: "Description here", cta: "Action" },
      about: { title: "About Our Story" },
      products: { title: "New Collection", limit: 4, showPricing: true },
      contact: { title: "Get in Touch" },
      whatsapp: { title: "Chat with Us" }
    };

    const newSection: Section = {
      id: `s${Date.now()}`,
      type,
      content: contentMap[type]
    };
    const updated = [...sections, newSection];
    setSections(updated);
    setActiveSectionId(newSection.id);
    persistSections(updated);
  };

  const removeSection = (id: string) => {
    const updated = sections.filter(s => s.id !== id);
    setSections(updated);
    if (activeSectionId === id) setActiveSectionId(null);
    persistSections(updated);
  };

  const activeSection = sections.find(s => s.id === activeSectionId);

  if (isProfileLoading || isWebsiteLoading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Establishing Editor Link...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50 overflow-hidden">
      {/* Editor Header */}
      <header className="h-14 border-b bg-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4 text-left">
          <Button asChild variant="ghost" size="sm" className="h-8">
            <Link href="/website">
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-primary">Page Editor</span>
            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">
              Registry: {websiteData?.storeName || 'Main Store'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg">
          <Button 
            variant={previewMode === "desktop" ? "secondary" : "ghost"} 
            size="icon" 
            className="h-8 w-8 rounded-md" 
            onClick={() => setPreviewMode("desktop")}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button 
            variant={previewMode === "mobile" ? "secondary" : "ghost"} 
            size="icon" 
            className="h-8 w-8 rounded-md"
            onClick={() => setPreviewMode("mobile")}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={websiteData?.status === 'published' ? 'default' : 'secondary'} className="text-[9px] font-black uppercase rounded-lg">
            {websiteData?.status || 'Draft'}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 text-[10px] font-bold uppercase rounded-xl"
            onClick={() => {
              const newStatus = websiteData?.status === 'published' ? 'draft' : 'published';
              setDocumentNonBlocking(websiteRef, { status: newStatus, updatedAt: serverTimestamp() }, { merge: true });
              toast({ title: `Store ${newStatus === 'published' ? 'Published' : 'Unpublished'}`, description: `Your store is now ${newStatus}.` });
            }}
          >
            {websiteData?.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-[10px] font-bold uppercase rounded-xl" asChild>
            <Link href="/shop" target="_blank">
              <Eye className="mr-2 h-3.5 w-3.5" /> Preview
            </Link>
          </Button>
          <Button className="bg-primary h-9 text-[10px] font-bold uppercase shadow-lg rounded-xl" onClick={() => toast({ title: "Node Synchronized", description: "All changes are saved to the cloud." })}>
            <Save className="mr-2 h-3.5 w-3.5" /> Save Changes
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Section List */}
        <div className="w-64 border-r bg-muted/10 flex flex-col shrink-0 text-left">
          <div className="p-4 border-b bg-white flex justify-between items-center">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Layout Nodes</h3>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-6 w-6 rounded-full border-primary/20 text-primary"><Plus className="h-3 w-3" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0 text-left">
                <SheetHeader className="p-6 border-b text-left">
                  <SheetTitle className="text-sm font-black uppercase tracking-tight">Add Section Node</SheetTitle>
                  <SheetDescription className="text-[10px] font-bold uppercase">Select a block to deploy to your page.</SheetDescription>
                </SheetHeader>
                <div className="p-4 grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-primary/10 hover:border-primary/40 hover:bg-primary/5" onClick={() => addSection("hero")}>
                    <Layout className="h-6 w-6 text-primary" /> <span className="text-[10px] font-black uppercase">HERO</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-primary/10 hover:border-primary/40 hover:bg-primary/5" onClick={() => addSection("about")}>
                    <Type className="h-6 w-6 text-primary" /> <span className="text-[10px] font-black uppercase">ABOUT</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-primary/10 hover:border-primary/40 hover:bg-primary/5" onClick={() => addSection("products")}>
                    <ShoppingCart className="h-6 w-6 text-primary" /> <span className="text-[10px] font-black uppercase">PRODUCTS</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-primary/10 hover:border-primary/40 hover:bg-primary/5" onClick={() => addSection("contact")}>
                    <MessageSquare className="h-6 w-6 text-primary" /> <span className="text-[10px] font-black uppercase">CONTACT</span>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {sections.length === 0 ? (
              <div className="p-10 text-center opacity-30 italic text-[10px] font-black uppercase">No sections yet.</div>
            ) : sections.map((s, idx) => (
              <div 
                key={s.id} 
                className={cn(
                  "p-3 rounded-xl border group cursor-pointer transition-all",
                  activeSectionId === s.id ? "bg-primary text-white border-primary shadow-md" : "bg-white hover:border-primary/50"
                )}
                onClick={() => setActiveSectionId(s.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-80">{s.type}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-white/20" onClick={(e) => { e.stopPropagation(); moveSection(s.id, "up"); }} disabled={idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-white/20" onClick={(e) => { e.stopPropagation(); moveSection(s.id, "down"); }} disabled={idx === sections.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:text-red-400" onClick={(e) => { e.stopPropagation(); removeSection(s.id); }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <GripVertical className="h-3 w-3 opacity-50 shrink-0" />
                  <span className="text-xs font-bold truncate">{s.content.title || `Untitled ${s.type}`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Live Preview Area */}
        <div className="flex-1 bg-muted/20 p-8 overflow-y-auto flex justify-center">
          <div className={cn(
            "bg-white shadow-2xl transition-all overflow-y-auto border-8 border-gray-900 rounded-[2.5rem]",
            previewMode === "desktop" ? "w-full max-w-5xl aspect-video" : "w-[375px] h-[667px]"
          )}>
            {/* Mock Website Rendering */}
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10 text-left">
              <span className="font-black text-sm text-primary uppercase">{websiteData?.storeName || 'MY BRAND'}</span>
              <div className="flex gap-4 text-[10px] font-bold uppercase opacity-60">
                <span>Products</span>
                <span>About</span>
                <span>Contact</span>
              </div>
            </div>
            
            <div className="space-y-0">
              {sections.map(s => (
                <div key={s.id} className={cn(
                  "p-8 border-2 border-transparent transition-all",
                  activeSectionId === s.id ? "border-primary/40 bg-primary/5" : ""
                )}>
                  {s.type === "hero" && (
                    <div className="text-center space-y-4 py-12">
                      <h1 className="text-4xl font-bold text-primary">{s.content.title}</h1>
                      <p className="text-muted-foreground">{s.content.subtitle}</p>
                      <Button className="rounded-full px-8 bg-primary">{s.content.cta || 'Get Started'}</Button>
                    </div>
                  )}
                  {s.type === "products" && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-bold text-center uppercase tracking-widest">{s.content.title}</h2>
                      <div className="grid grid-cols-2 gap-4">
                        {(() => {
                          const activeProducts = dbProducts?.filter((p: any) => p.showOnWebsite && !p.isArchived) || [];
                          const itemsToRender = activeProducts.length > 0 
                            ? activeProducts.slice(0, parseInt(s.content.limit) || 4)
                            : Array.from({ length: Math.max(1, parseInt(s.content.limit) || 4) });

                          return itemsToRender.map((p: any, i: number) => (
                            <div key={p?.id || i} className="bg-muted rounded-xl aspect-square flex flex-col items-center justify-center p-4">
                              {p?.images?.[0] ? (
                                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover rounded-lg mb-2" />
                              ) : (
                                  <div className="w-full h-full bg-white/50 rounded-lg mb-2" />
                              )}
                              <div className="w-3/4 h-2 bg-muted-foreground/20 rounded mb-1 text-[10px] font-black truncate">{p?.name || ""}</div>
                              {s.content.showPricing && <div className="w-1/4 h-2 bg-primary/20 rounded text-[10px] font-black">{p?.onlinePrice || p?.price || ""}</div>}
                              {!s.content.showPricing && <div className="w-1/2 h-2 bg-muted-foreground/20 rounded" />}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                  {s.type === "about" && (
                    <div className="py-10 text-left">
                      <h2 className="text-xl font-bold mb-4">{s.content.title || 'About Us'}</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">Our journey began with a simple mission: to empower local businesses with technology that actually works.</p>
                    </div>
                  )}
                  {s.type === "contact" && (
                    <div className="py-10 text-center space-y-4">
                       <h2 className="text-xl font-bold">{s.content.title || 'Get in Touch'}</h2>
                       <div className="p-4 bg-muted/20 rounded-xl max-w-xs mx-auto text-xs font-bold uppercase">{websiteData?.contactPhone || 'Contact Node'}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="p-8 bg-primary/5 text-center text-[10px] text-muted-foreground uppercase font-bold">
              © {new Date().getFullYear()} {websiteData?.storeName || 'Brand'}. Powered by Biztrix AI OS.
            </div>
          </div>
        </div>

        {/* Right Sidebar: Contextual Editor */}
        <div className="w-80 border-l bg-white flex flex-col shrink-0 text-left">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Node Settings
            </h3>
            {activeSection && <Badge variant="outline" className="text-[8px] font-black uppercase">{activeSection.type}</Badge>}
          </div>

          {activeSection ? (
<div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="flex bg-muted/20 p-1 rounded-xl mb-6">
                <Button variant={activeTab === 'node' ? 'secondary' : 'ghost'} size="sm" className="flex-1 h-8 text-[9px] font-black uppercase rounded-lg" onClick={() => setActiveTab('node')}>Node</Button>
                <Button variant={activeTab === 'theme' ? 'secondary' : 'ghost'} size="sm" className="flex-1 h-8 text-[9px] font-black uppercase rounded-lg" onClick={() => setActiveTab('theme')}>Theme</Button>
              </div>

              {activeTab === 'theme' ? (
                <div className="space-y-4">
                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Primary Color</Label>
                    <div className="flex gap-2">
                       <Input 
                         type="color" 
                         value={websiteData?.primaryColor || "#0C83B3"} 
                         onChange={(e) => setDocumentNonBlocking(websiteRef, { primaryColor: e.target.value }, { merge: true })}
                         className="h-11 w-14 p-1 rounded-xl"
                       />
                       <Input 
                         value={websiteData?.primaryColor || "#0C83B3"} 
                         onChange={(e) => setDocumentNonBlocking(websiteRef, { primaryColor: e.target.value }, { merge: true })}
                         className="text-sm font-black h-11 rounded-xl flex-1" 
                       />
                    </div>
                  </div>
                </div>
              ) : activeSection ? (
                <>
                  {activeSection.type === "hero" && (
                    <>
                      <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Hero Heading</Label>
                        <Input 
                          value={activeSection.content.title} 
                          onChange={(e) => updateActiveSectionContent('title', e.target.value)}
                          className="text-sm font-bold h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Sub-heading</Label>
                        <Textarea 
                          value={activeSection.content.subtitle}
                          onChange={(e) => updateActiveSectionContent('subtitle', e.target.value)}
                          className="text-xs min-h-[100px] rounded-xl bg-muted/5 border-none shadow-inner"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Primary CTA Button</Label>
                        <Input 
                          value={activeSection.content.cta} 
                          onChange={(e) => updateActiveSectionContent('cta', e.target.value)}
                          className="text-sm rounded-xl h-11" 
                          placeholder="e.g. Shop Now" 
                        />
                      </div>
                    </>
                  )}
                  
                  {activeSection.type === "products" && (
                    <div className="space-y-4">
                      <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Section Title</Label>
                        <Input 
                          value={activeSection.content.title} 
                          onChange={(e) => updateActiveSectionContent('title', e.target.value)}
                          className="text-sm font-bold h-11 rounded-xl" 
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-transparent">
                        <div className="space-y-0.5 text-left">
                          <Label className="text-[11px] font-black uppercase text-slate-900">Show Pricing</Label>
                          <p className="text-[9px] text-muted-foreground font-bold uppercase">Display item rates</p>
                        </div>
                        <Switch 
                          checked={activeSection.content.showPricing} 
                          onCheckedChange={(checked) => updateActiveSectionContent('showPricing', checked)}
                          className="scale-90 data-[state=checked]:bg-primary" 
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Product Limit</Label>
                        <Input 
                          type="number" 
                          value={activeSection.content.limit} 
                          onChange={(e) => updateActiveSectionContent('limit', e.target.value)}
                          className="text-sm font-black h-11 rounded-xl bg-muted/10 border-none" 
                        />
                      </div>
                    </div>
                  )}

                  {activeSection.type === "about" && (
                    <div className="space-y-2 text-left">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Section Title</Label>
                      <Input 
                        value={activeSection.content.title} 
                        onChange={(e) => updateActiveSectionContent('title', e.target.value)}
                        className="text-sm font-bold h-11 rounded-xl" 
                      />
                    </div>
                  )}

                  {activeSection.type === "contact" && (
                    <div className="space-y-2 text-left">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Section Title</Label>
                      <Input 
                        value={activeSection.content.title} 
                        onChange={(e) => updateActiveSectionContent('title', e.target.value)}
                        className="text-sm font-black h-11 rounded-xl" 
                      />
                    </div>
                  )}

                  <div className="pt-6 border-t">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Design Protocol</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" size="sm" className="h-10 text-[9px] font-black uppercase bg-primary/5 border-primary text-primary">MODERN NODE</Button>
                      <Button variant="outline" size="sm" className="h-10 text-[9px] font-black uppercase text-slate-400">MINIMAL NODE</Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-30">
                  <div className="h-14 w-14 rounded-2xl bg-muted/20 flex items-center justify-center mb-6 shadow-inner"><Layout className="h-7 w-7 text-slate-400" /></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">Select a layout node to initialize content editing.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-30">
              <div className="h-14 w-14 rounded-2xl bg-muted/20 flex items-center justify-center mb-6 shadow-inner"><Layout className="h-7 w-7 text-slate-400" /></div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">Select a layout node to initialize content editing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
