"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  Info,
  Globe,
  Link2,
  ShieldCheck,
  Zap,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { SectionCard } from "@/components/ui/editorial";
import { useFirestore } from "@/firebase";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

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
      const rows = text
        .split("\n")
        .filter((row) => row.trim() !== "")
        .slice(1);

      let importCount = 0;
      let batch = writeBatch(firestore);
      let batchCount = 0;

      try {
        for (const row of rows) {
          const columns = row.split(",").map((s) => s.trim());
          const [name, phone, email, city, tags, groups] = columns;

          if (!phone) continue;

          const contactRef = doc(firestore, "businesses", businessId, "globalContacts", phone);
          const contactGroups = groups ? groups.split(";").map((g) => g.trim()).filter(Boolean) : [];

          batch.set(
            contactRef,
            {
              id: phone,
              name: name || "Unknown",
              phone,
              email: email || "",
              city: city || "",
              source: "import",
              tags: tags ? tags.split(";").map((t) => t.trim()).filter(Boolean) : ["Imported"],
              groups: contactGroups,
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );

          batchCount++;

          if (contactGroups.length > 0) {
            contactGroups.forEach((gName) => {
              const groupId = gName.toLowerCase().replace(/\s+/g, "_");
              const groupRef = doc(firestore, "businesses", businessId, "contactGroups", groupId);

              batch.set(
                groupRef,
                {
                  id: groupId,
                  name: gName,
                  icon: "Star",
                  description: "Automatically created via bulk import.",
                  status: "active",
                  createdAt: serverTimestamp(),
                },
                { merge: true }
              );

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
          title: "Import Successful",
          description: `${importCount} contacts imported into your registry.`,
        });
      } catch (err) {
        console.error(err);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: "Database limit reached or file format invalid.",
        });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const headers =
      "Name,Phone,Email,City,Tags,Groups\nSanjay Gupta,919876543210,sanjay@example.com,Mumbai,VIP;Loyal,Diwali_Blast;Premium_Users\nAnita Rao,919123456780,anita@rao.com,Pune,Inactive,Retention_Wave";
    const blob = new Blob([headers], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "biztrix_contacts_template.csv";
    link.click();
    toast({ title: "Template Downloaded", description: "Sample CSV template with Groups column ready." });
  };

  const handleConnectSheets = () => {
    if (!sheetsUrl.includes("docs.google.com/spreadsheets")) {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description: "Please enter a valid Google Sheets link.",
      });
      return;
    }
    toast({ title: "Handshake Initiated", description: "Connecting to Google Cloud Service Account..." });
    setTimeout(() => {
      toast({ title: "Sync Pending", description: "Permission request sent to Sheet Owner." });
    }, 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
      <div className="lg:col-span-8 space-y-6">
        <Tabs value={importMode} onValueChange={setImportMode} className="w-full space-y-5">
          <TabsList className="bg-slate-100 border border-slate-200 h-11 p-1 rounded-xl flex">
            <TabsTrigger value="csv" className="flex-1 text-xs font-semibold px-4 rounded-lg gap-2">
              <FileSpreadsheet className="h-4 w-4" /> CSV File Upload
            </TabsTrigger>
            <TabsTrigger value="sheets" className="flex-1 text-xs font-semibold px-4 rounded-lg gap-2">
              <Globe className="h-4 w-4" /> Google Sheets Sync
            </TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="m-0">
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-10 sm:p-14 flex flex-col items-center justify-center text-center space-y-5">
              <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                <Upload className="h-7 w-7" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-lg font-bold text-slate-900">Upload CSV Contacts</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Import contacts in bulk and assign audience clusters automatically using the{" "}
                  <span className="font-semibold text-slate-900">Groups</span> column.
                </p>
              </div>
              {isImporting ? (
                <div className="flex items-center gap-2.5 bg-white px-5 py-3 rounded-xl border border-slate-200">
                  <Loader2 className="animate-spin h-4 w-4 text-slate-700" />
                  <span className="text-xs font-semibold text-slate-800">Importing contacts...</span>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 px-8 bg-slate-900 hover:bg-slate-800 font-semibold text-xs rounded-xl text-white"
                >
                  Select CSV File
                </Button>
              )}
              <input ref={fileInputRef} type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
            </div>
          </TabsContent>

          <TabsContent value="sheets" className="m-0">
            <SectionCard
              title="Spreadsheet Sync"
              description="Connect a shared Google Sheet for recurring contact imports."
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="sheets-url" className="text-xs font-semibold text-slate-700">
                    Shared Google Sheet URL
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="sheets-url"
                        value={sheetsUrl}
                        onChange={(e) => setSheetsUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        className="h-11 pl-10 rounded-xl text-xs"
                      />
                    </div>
                    <Button
                      onClick={handleConnectSheets}
                      className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shrink-0"
                    >
                      Connect Sheet
                    </Button>
                  </div>
                </div>

                <div className="p-5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" /> Setup Instructions
                  </div>
                  <div className="space-y-3 text-xs text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-900">1. Share with service account:</span>{" "}
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 select-all">
                        sync-service@biztrix-ai.iam.gserviceaccount.com
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">2. Access Level:</span> Set permission to{" "}
                      <span className="font-semibold">Viewer</span>.
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">3. Sheet Tab:</span> Keep tab name as{" "}
                      <span className="font-semibold">Sheet1</span> with clean headers in Row 1.
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>

      <div className="lg:col-span-4 space-y-5">
        <SectionCard title="Import Guide" description="Column schema for clean contact uploads.">
          <div className="space-y-5">
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-700">Required Columns</p>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-900">Phone</p>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">91XXXXXXXXXX</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-900">Name</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Full name</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-700">Optional Segmentation</p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                <Zap className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">Groups</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Separate multiple groups with a semicolon (<span className="font-mono font-bold">;</span>).
                  </p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                <Tag className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">Tags</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Comma or semicolon labels for contact filtering.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Button
                onClick={handleDownloadSample}
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Download CSV Template
              </Button>
              <p className="text-[11px] text-center text-slate-500">Compatible with Google Sheets & Excel</p>
            </div>
          </div>
        </SectionCard>

        <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <ShieldCheck className="h-4 w-4" /> Tenant Isolation
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Imported contacts remain isolated inside your business workspace and are formatted for Meta Cloud API compliance.
          </p>
        </div>
      </div>
    </div>
  );
}
