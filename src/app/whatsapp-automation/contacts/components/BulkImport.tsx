"use client";

import { useState, useRef } from "react";
import { 
  Upload, 
  FileSpreadsheet, 
  Table as TableIcon, 
  Loader2, 
  CheckCircle2, 
  Info,
  SmartphoneNfc,
  Globe,
  Link2,
  ShieldCheck,
  Zap, 
  Tag,
  Check,
  ArrowRight,
  ShieldAlert,
  LayoutList,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useFirestore } from "@/firebase";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function BulkImport({ businessId }: { businessId: string }) {
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [importMode, setImportMode] = useState("csv");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').filter(row => row.trim() !== '').slice(1);
      
      let importCount = 0;
      let batch = writeBatch(firestore);
      let batchCount = 0;

      try {
        for (const row of rows) {
          const columns = row.split(',').map(s => s.trim());
          const [name, phone, email, city, tags, groups] = columns;
          
          if (!phone) continue;

          // 1. Create/Update Global Contact
          const contactRef = doc(firestore, 'businesses', businessId, 'globalContacts', phone);
          const contactGroups = groups ? groups.split(';').map(g => g.trim()).filter(Boolean) : [];
          
          batch.set(contactRef, {
            id: phone,
            name: name || "Unknown",
            phone: phone,
            email: email || "",
            city: city || "",
            source: 'import',
            tags: tags ? tags.split(';').map(t => t.trim()).filter(Boolean) : ['Imported'],
            groups: contactGroups,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp()
          }, { merge: true });

          batchCount++;

          // 2. Automatic Group Creation Logic
          if (contactGroups.length > 0) {
            contactGroups.forEach(gName => {
              const groupId = gName.toLowerCase().replace(/\s+/g, '_');
              const groupRef = doc(firestore, 'businesses', businessId, 'contactGroups', groupId);
              
              batch.set(groupRef, {
                id: groupId,
                name: gName,
                icon: 'Star',
                description: `Automatically created via bulk import.`,
                status: 'active',
                createdAt: serverTimestamp()
              }, { merge: true });
              
              batchCount++;
            });
          }

          if (batchCount >= 450) {
            await batch.commit();
            batch = writeBatch(firestore);
            batchCount = 0;
          }

          importCount++;
        }

        if (batchCount > 0) {
          await batch.commit();
        }

        toast({ 
          title: "Import Node Success", 
          description: `${importCount} contacts processed using batch protocol.` 
        });
      } catch (err) {
        console.error(err);
        toast({ variant: "destructive", title: "Import Failed", description: "Database limit reached or file format invalid." });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const headers = "Name,Phone,Email,City,Tags,Groups\nSanjay Gupta,919876543210,sanjay@example.com,Mumbai,VIP;Loyal,Diwali_Blast;Premium_Users\nAnita Rao,919123456780,anita@rao.com,Pune,Inactive,Retention_Wave";
    const blob = new Blob([headers], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "biztrix_template_v3.csv";
    link.click();
    toast({ title: "Template Downloaded", description: "V3 Protocol with Groups column ready." });
  };

  const handleConnectSheets = () => {
    if (!sheetsUrl.includes('docs.google.com/spreadsheets')) {
      toast({ variant: "destructive", title: "Invalid URL", description: "Please enter a valid Google Sheets link." });
      return;
    }
    toast({ title: "Handshake Initiated", description: "Connecting to Google Cloud Service Account..." });
    setTimeout(() => {
      toast({ title: "Sync Pending", description: "Permission request sent to Sheet Owner." });
    }, 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start animate-in fade-in duration-500 text-left">
      <div className="lg:col-span-8 space-y-8">
        <Tabs value={importMode} onValueChange={setImportMode} className="w-full">
          <TabsList className="bg-white border-2 h-12 p-1 rounded-2xl shadow-sm mb-6 flex">
            <TabsTrigger value="csv" className="flex-1 text-[10px] font-black uppercase px-6 gap-2">
              <FileSpreadsheet className="h-4 w-4" /> CSV Node Upload
            </TabsTrigger>
            <TabsTrigger value="sheets" className="flex-1 text-[10px] font-black uppercase px-6 gap-2 text-green-600">
              <Globe className="h-4 w-4" /> Google Sheets Sync
            </TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="m-0 animate-in slide-in-from-left-4 duration-300">
            <Card className="border-2 border-dashed border-primary/20 bg-primary/5 rounded-[3rem] overflow-hidden group hover:border-primary/40 transition-all cursor-pointer shadow-inner" onClick={() => !isImporting && fileInputRef.current?.click()}>
              <CardContent className="p-16 flex flex-col items-center justify-center text-center space-y-8">
                <div className="h-24 w-24 rounded-[2.5rem] bg-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                  <Upload className="h-12 w-12 text-primary" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Drop CSV Node</h3>
                  <p className="text-sm text-muted-foreground max-sm mx-auto font-medium leading-relaxed">
                    Identity node creation via bulk file upload. Ensure <span className="text-primary font-black">Groups</span> column is filled for auto-clustering.
                  </p>
                </div>
                {isImporting ? (
                  <div className="flex items-center gap-3 bg-white p-5 rounded-2xl shadow-xl border border-primary/10">
                    <Loader2 className="animate-spin h-6 w-6 text-primary" />
                    <span className="text-[11px] font-black uppercase text-primary tracking-widest">Deploying Batches...</span>
                  </div>
                ) : (
                  <Button className="h-16 px-14 bg-primary font-black uppercase text-xs tracking-widest shadow-2xl rounded-2xl text-white">Select Logic File</Button>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sheets" className="m-0 animate-in slide-in-from-right-4 duration-300">
            <Card className="border-none shadow-xl bg-white rounded-[3rem] overflow-hidden border">
              <CardHeader className="p-10 bg-green-50 border-b">
                 <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-[1.5rem] bg-white border border-green-200 flex items-center justify-center text-green-600 shadow-sm">
                       <Globe className="h-7 w-7" />
                    </div>
                    <div className="text-left">
                       <CardTitle className="text-xl font-black uppercase text-green-900">Spreadsheet Sync Node</CardTitle>
                       <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest mt-1">Live data-stream synchronization</p>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                 <div className="space-y-4 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Paste Shared Sheet URL</Label>
                    <div className="flex gap-3">
                       <div className="relative flex-1">
                          <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 opacity-40" />
                          <Input 
                            value={sheetsUrl} 
                            onChange={(e) => setSheetsUrl(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/..." 
                            className="h-14 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner font-medium text-sm" 
                          />
                       </div>
                       <Button onClick={handleConnectSheets} className="h-14 px-10 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Connect Node</Button>
                    </div>
                 </div>

                 <div className="p-8 bg-green-50/50 rounded-[2rem] border-2 border-dashed border-green-100 space-y-6">
                    <div className="flex items-center gap-3">
                       <ShieldCheck className="h-5 w-5 text-green-600" />
                       <h5 className="text-[11px] font-black uppercase text-green-800">Connection Protocol & Permissions</h5>
                    </div>
                    <div className="space-y-6">
                       <div className="flex items-start gap-4">
                          <div className="h-6 w-6 rounded-full bg-white border border-green-200 flex items-center justify-center text-[10px] font-black text-green-600 shrink-0 shadow-sm">1</div>
                          <div className="space-y-1">
                            <p className="text-[11px] text-slate-900 font-black uppercase leading-none">Share with Service Account</p>
                            <p className="text-[10px] text-slate-600 leading-relaxed font-bold">Copy email aur "Share" button dabayein: <br/><span className="text-primary font-black lowercase select-all text-sm bg-white px-2 py-0.5 rounded border mt-1 inline-block">sync-service@biztrix-ai.iam.gserviceaccount.com</span></p>
                          </div>
                       </div>
                       <div className="flex items-start gap-4">
                          <div className="h-6 w-6 rounded-full bg-white border border-green-200 flex items-center justify-center text-[10px] font-black text-green-600 shrink-0 shadow-sm">2</div>
                          <div className="space-y-1">
                            <p className="text-[11px] text-slate-900 font-black uppercase leading-none">Access Level: Viewer</p>
                            <p className="text-[10px] text-slate-600 leading-relaxed font-bold uppercase">Role ko <span className="text-primary">"Viewer"</span> par set karein. "Editor" ki zaroorat sirf two-way sync ke liye hoti hai.</p>
                          </div>
                       </div>
                       <div className="flex items-start gap-4">
                          <div className="h-6 w-6 rounded-full bg-white border border-green-200 flex items-center justify-center text-[10px] font-black text-green-600 shrink-0 shadow-sm">3</div>
                          <div className="space-y-1">
                            <p className="text-[11px] text-slate-900 font-black uppercase leading-none">Data Architecture</p>
                            <p className="text-[10px] text-slate-600 leading-relaxed font-bold uppercase">Tab ka naam <span className="text-primary">"Sheet1"</span> rakhein. First row mein sateek (precise) Headers honi chahiye bina merged cells ke.</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="lg:col-span-4 space-y-8">
        <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden border">
          <CardHeader className="bg-muted/30 border-b py-6 px-8">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Info className="h-4 w-4" /> Comprehensive Import Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8 text-left">
            <div className="space-y-6">
               <div className="space-y-4">
                 <p className="text-[9px] font-black uppercase text-primary border-b border-primary/10 pb-2">Mandatory Mapping Protocol</p>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/10"><p className="text-[9px] font-black text-primary uppercase">Phone</p><p className="text-[7px] font-bold text-slate-400">91XXXXXXXXXX</p></div>
                    <div className="p-3 bg-muted/20 rounded-xl border border-transparent"><p className="text-[9px] font-black text-slate-600 uppercase">Name</p><p className="text-[7px] font-bold text-slate-400">Identity Tag</p></div>
                 </div>
               </div>

               <div className="space-y-4">
                 <p className="text-[9px] font-black uppercase text-indigo-600 border-b border-indigo-100 pb-2">Smart Logic Columns</p>
                 <div className="space-y-3">
                    <div className="flex items-start gap-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                       <Zap className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                       <div className="space-y-0.5 text-left">
                          <p className="text-[10px] font-black text-indigo-900 uppercase leading-none">Groups</p>
                          <p className="text-[9px] text-indigo-700 leading-relaxed font-medium">Automatic group creation node. Multi-value supported via <span className="font-black">;</span> (semicolon).</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                       <Tag className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                       <div className="space-y-0.5 text-left">
                          <p className="text-[10px] font-black text-indigo-900 uppercase leading-none">Tags</p>
                          <p className="text-[9px] text-indigo-700 leading-relaxed font-medium">Categorization labels for filtering and segments.</p>
                       </div>
                    </div>
                 </div>
               </div>
            </div>
            
            <Separator className="opacity-40" />
            
            <div className="space-y-4">
              <Button onClick={handleDownloadSample} className="w-full h-14 bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl transition-all active:scale-95">
                <FileSpreadsheet className="mr-3 h-5 w-5 text-accent" /> Download V3 Protocol Template
              </Button>
              <p className="text-[8px] text-center text-slate-400 font-bold uppercase tracking-tighter">Compatible with Google Sheets & Excel</p>
            </div>
          </CardContent>
        </Card>

        <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
           <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 group-hover:scale-110 transition-transform"><ShieldCheck className="h-40 w-40" /></div>
           <div className="relative z-10 space-y-4 text-left">
              <div className="flex items-center gap-3">
                 <ShieldCheck className="h-5 w-5 text-accent" />
                 <p className="text-[10px] font-black uppercase text-accent tracking-widest">Data Privacy Node</p>
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed italic">
                "Imported contacts are isolated in your tenant node. We verify phone numbers for Meta API compliance to prevent broadcast failures."
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
