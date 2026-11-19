"use client";

import { useState } from "react";
import {
  Users,
  Plus,
  Loader2,
  RefreshCcw,
  Grid,
  CloudUpload,
  ShieldCheck,
  LayoutList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/editorial";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, commitBatchNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, getDocs, writeBatch, getDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

import { ContactRegistry } from "./components/ContactRegistry";
import { BulkImport } from "./components/BulkImport";
import { ContactGroups } from "./components/ContactGroups";
import { Compliance } from "./components/Compliance";

export default function GlobalContactHub() {
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

  const [activeTab, setActiveTab] = useState("registry");
  const [isSyncing, setIsSyncing] = useState(false);

  const contactsQuery = useMemoFirebase(
    () =>
      businessId
        ? query(collection(firestore, "businesses", businessId, "globalContacts"), orderBy("createdAt", "desc"))
        : null,
    [firestore, businessId]
  );
  const { data: contactsRaw, isLoading: isContactsLoading } = useCollection<any>(contactsQuery);
  const contacts = contactsRaw || [];

  const handleSyncSources = async () => {
    if (!businessId) return;
    setIsSyncing(true);
    try {
      const [customersSnap, membersSnap, leadsSnap] = await Promise.all([
        getDocs(collection(firestore, "businesses", businessId, "customers")),
        getDocs(collection(firestore, "businesses", businessId, "memberships")),
        getDocs(collection(firestore, "businesses", businessId, "leads")),
      ]);

      let batch = writeBatch(firestore);
      let count = 0;
      const syncedCustomerPhones = new Set<string>();

      for (const cDoc of customersSnap.docs) {
        const cData = cDoc.data();
        if (!cData.phone) continue;

        syncedCustomerPhones.add(String(cData.phone).replace(/\D/g, "").slice(-10));
        const contactRef = doc(firestore, "businesses", businessId, "globalContacts", cData.phone);
        batch.set(
          contactRef,
          {
            id: cData.phone,
            name: cData.name,
            phone: cData.phone,
            email: cData.email || "",
            source: "customer",
            city: cData.city || "",
            tags: cData.tags || ["Customer"],
            updatedAt: serverTimestamp(),
            createdAt: cData.createdAt || serverTimestamp(),
          },
          { merge: true }
        );

        count++;
        if (count >= 450) {
          await commitBatchNonBlocking(batch);
          batch = writeBatch(firestore);
          count = 0;
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      for (const mDoc of membersSnap.docs) {
        const mData = mDoc.data();
        const custRef = doc(firestore, "businesses", businessId, "customers", mData.customerId);
        const custSnap = await getDoc(custRef);

        if (custSnap.exists()) {
          const cData = custSnap.data();
          if (!cData.phone) continue;

          const contactRef = doc(firestore, "businesses", businessId, "globalContacts", cData.phone);
          batch.set(
            contactRef,
            {
              source: "member",
              tags: Array.from(new Set([...(cData.tags || []), "Member"])),
            },
            { merge: true }
          );

          count++;
          if (count >= 450) {
            await commitBatchNonBlocking(batch);
            batch = writeBatch(firestore);
            count = 0;
            await new Promise((r) => setTimeout(r, 200));
          }
        }
      }

      for (const lDoc of leadsSnap.docs) {
        const lData = lDoc.data();
        if (!lData.phone) continue;

        const cleanLeadPhone = String(lData.phone).trim();
        const last10 = cleanLeadPhone.replace(/\D/g, "").slice(-10);
        const alreadyCustomer = Boolean(last10 && syncedCustomerPhones.has(last10));
        const leadTags = Array.from(
          new Set(["Lead", ...(lData.source ? [String(lData.source)] : [])])
        );

        const contactRef = doc(
          firestore,
          "businesses",
          businessId,
          "globalContacts",
          cleanLeadPhone
        );
        batch.set(
          contactRef,
          {
            id: cleanLeadPhone,
            name: lData.name || "CRM Lead",
            phone: cleanLeadPhone,
            email: lData.email || "",
            ...(alreadyCustomer ? {} : { source: "lead" }),
            city: lData.location || "",
            tags: alreadyCustomer
              ? Array.from(new Set(["Customer", ...leadTags]))
              : leadTags,
            leadId: lDoc.id,
            updatedAt: serverTimestamp(),
            createdAt: lData.createdAt || serverTimestamp(),
          },
          { merge: true }
        );

        count++;
        if (count >= 450) {
          await commitBatchNonBlocking(batch);
          batch = writeBatch(firestore);
          count = 0;
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      if (count > 0) {
        await commitBatchNonBlocking(batch);
      }

      toast({
        title: "Contacts Synced",
        description: "Customers, loyalty members, and CRM leads merged into the contact hub.",
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Sync Failed" });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isContactsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-left">
      <PageHeader
        breadcrumb="WhatsApp Cloud · Audience"
        title="Contact Hub"
        description="Unified audience registry combining CRM leads, customers, loyalty members, and CSV imports."
        icon={Users}
        actions={
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="outline"
              onClick={handleSyncSources}
              disabled={isSyncing}
              className="h-10 px-4 rounded-xl border-slate-200 bg-white text-slate-700 font-semibold text-xs"
            >
              {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Sync Sources
            </Button>
            <Button
              onClick={() => setActiveTab("import")}
              className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
            >
              <Plus className="mr-2 h-4 w-4" /> Bulk Import
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-slate-100 border border-slate-200 h-12 p-1 rounded-xl flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="registry" className="flex-1 text-xs font-semibold px-5 rounded-lg gap-2 whitespace-nowrap">
            <LayoutList className="h-4 w-4" /> Contact Registry
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex-1 text-xs font-semibold px-5 rounded-lg gap-2 whitespace-nowrap">
            <Grid className="h-4 w-4" /> Contact Groups
          </TabsTrigger>
          <TabsTrigger value="import" className="flex-1 text-xs font-semibold px-5 rounded-lg gap-2 whitespace-nowrap">
            <CloudUpload className="h-4 w-4" /> Bulk Import
          </TabsTrigger>
          <TabsTrigger value="blacklist" className="flex-1 text-xs font-semibold px-5 rounded-lg gap-2 whitespace-nowrap">
            <ShieldCheck className="h-4 w-4" /> Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="m-0">
          <ContactRegistry contacts={contacts} businessId={businessId!} business={business} />
        </TabsContent>

        <TabsContent value="groups" className="m-0">
          <ContactGroups businessId={businessId!} contacts={contacts} />
        </TabsContent>

        <TabsContent value="import" className="m-0">
          <BulkImport businessId={businessId!} />
        </TabsContent>

        <TabsContent value="blacklist" className="m-0">
          <Compliance />
        </TabsContent>
      </Tabs>
    </div>
  );
}
