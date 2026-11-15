"use client";

import { useState, useMemo } from "react";
import { 
  Users, 
  Plus, 
  SmartphoneNfc, 
  Loader2, 
  RefreshCcw, 
  Grid,
  CloudUpload,
  ShieldCheck,
  LayoutList,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, setDocumentNonBlocking, commitBatchNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, getDocs, writeBatch, getDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

// Sub-components (Internal to this module)
import { ContactRegistry } from "./components/ContactRegistry";
import { BulkImport } from "./components/BulkImport";
import { ContactGroups } from "./components/ContactGroups";
import { Compliance } from "./components/Compliance";

export default function GlobalContactHub() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: profile } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const [activeTab, setActiveTab] = useState("registry");
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Core Contacts Collection
  const contactsQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'globalContacts'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  const { data: contactsRaw, isLoading: isContactsLoading } = useCollection<any>(contactsQuery);
  const contacts = contactsRaw || [];

  // Sync Logic: Merge Members and Customers into Unified Contacts using Write Batches
  const handleSyncNodes = async () => {
    if (!businessId) return;
    setIsSyncing(true);
    try {
      const customersSnap = await getDocs(collection(firestore, 'businesses', businessId, 'customers'));
      const membersSnap = await getDocs(collection(firestore, 'businesses', businessId, 'memberships'));
      
      let batch = writeBatch(firestore);
      let count = 0;

      // 1. Process Customers
      for (const cDoc of customersSnap.docs) {
        const cData = cDoc.data();
        if (!cData.phone) continue;
        
        const contactRef = doc(firestore, 'businesses', businessId, 'globalContacts', cData.phone);
        batch.set(contactRef, {
          id: cData.phone,
          name: cData.name,
          phone: cData.phone,
          email: cData.email || "",
          source: 'customer',
          city: cData.city || "",
          tags: cData.tags || ['Customer'],
          updatedAt: serverTimestamp(),
          createdAt: cData.createdAt || serverTimestamp()
        }, { merge: true });
        
        count++;
        if (count >= 450) { // Safety limit for batch size
          await commitBatchNonBlocking(batch);
          batch = writeBatch(firestore);
          count = 0;
          // Small pause to prevent hitting rate limits
          await new Promise(r => setTimeout(r, 200));
        }
      }

      // 2. Process Members
      for (const mDoc of membersSnap.docs) {
        const mData = mDoc.data();
        const custRef = doc(firestore, 'businesses', businessId, 'customers', mData.customerId);
        const custSnap = await getDoc(custRef);
        
        if (custSnap.exists()) {
          const cData = custSnap.data();
          if (!cData.phone) continue;
          
          const contactRef = doc(firestore, 'businesses', businessId, 'globalContacts', cData.phone);
          batch.set(contactRef, {
            source: 'member',
            tags: Array.from(new Set([...(cData.tags || []), 'Member']))
          }, { merge: true });
          
          count++;
          if (count >= 450) {
            await commitBatchNonBlocking(batch);
            batch = writeBatch(firestore);
            count = 0;
            await new Promise(r => setTimeout(r, 200));
          }
        }
      }

      if (count > 0) {
        await commitBatchNonBlocking(batch);
      }

      toast({ title: "Nodes Synced", description: "Identity sources have been updated using batch protocol." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Sync Failed" });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isContactsLoading) return <div className="flex items-center justify-center py-20 opacity-40"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 px-2 sm:px-0 text-left">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-4 text-left">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Contact Hub</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Unified Registry Node</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncNodes} disabled={isSyncing} className="h-10 px-4 rounded-xl border-primary/20 text-primary font-black uppercase text-[9px] tracking-widest shadow-sm bg-white">
            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Sync Sources
          </Button>
          <Button onClick={() => setActiveTab("import")} className="bg-primary hover:bg-primary/90 shadow-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
            <Plus className="mr-2 h-4 w-4" /> Bulk Import
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border h-14 p-1.5 rounded-2xl shadow-sm mb-10 flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="registry" className="flex-1 text-[10px] font-black uppercase px-8 gap-2"><LayoutList className="h-4 w-4" /> Hub Registry</TabsTrigger>
          <TabsTrigger value="groups" className="flex-1 text-[10px] font-black uppercase px-8 gap-2 text-indigo-600"><Grid className="h-4 w-4" /> Contact Groups</TabsTrigger>
          <TabsTrigger value="import" className="flex-1 text-[10px] font-black uppercase px-8 gap-2 text-primary"><CloudUpload className="h-4 w-4" /> Bulk Import Node</TabsTrigger>
          <TabsTrigger value="blacklist" className="flex-1 text-[10px] font-black uppercase px-8 gap-2 text-red-600"><ShieldCheck className="h-4 w-4" /> Compliance</TabsTrigger>
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
