"use client";

import { use, useState, useMemo } from "react";
import { 
  Building2, 
  History, 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  DollarSign, 
  Clock, 
  Handshake, 
  User,
  BadgeCheck
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser } from "@/firebase";
import { doc, query, where, orderBy, collection } from "firebase/firestore";
import { format } from "date-fns";
import Link from "next/link";

export default function VendorDetailPage(props: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = use(props.params);
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId) : null, [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);
  const currencySymbol = getCurrencySymbol(business?.currency);

  const vendorRef = useMemoFirebase(() => businessId ? doc(firestore, 'businesses', businessId, 'vendors', vendorId) : null, [firestore, businessId, vendorId]);
  const { data: vendor, isLoading: isVendorLoading } = useDoc<any>(vendorRef);

  const ledgerQuery = useMemoFirebase(() => {
    if (!businessId || !vendorId) return null;
    return query(
      collection(firestore, 'businesses', businessId, 'cashbook'),
      where('vendorId', '==', vendorId),
      orderBy('date', 'asc')
    );
  }, [firestore, businessId, vendorId]);

  const { data: ledgerData, isLoading: isLedgerLoading } = useCollection<any>(ledgerQuery);

  const calculatedLedger = useMemo(() => {
    if (!ledgerData || !vendor) return [];
    
    let currentBalance = vendor.openingBalance || 0;
    const initialEntry = {
      id: 'opening',
      date: vendor.createdAt?.toDate ? format(vendor.createdAt.toDate(), 'yyyy-MM-dd') : 'Original',
      particulars: 'Opening Balance Node',
      type: 'credit',
      amount: currentBalance,
      balance: currentBalance
    };

    const entries = ledgerData.map((t: any) => {
      if (t.type === 'debit') currentBalance -= t.amount;
      else currentBalance += t.amount;

      return {
        ...t,
        balance: currentBalance
      };
    });

    return [initialEntry, ...entries].reverse();
  }, [ledgerData, vendor]);

  if (isVendorLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  if (!vendor) return <div className="p-20 text-center">Vendor not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full"><Link href="/vendors"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <h1 className="text-3xl font-black tracking-tight">{vendor.name}</h1>
      </div>

      <div className="p-8 bg-primary text-white rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Building2 className="h-40 w-40" /></div>
        <div className="relative z-10 flex items-center gap-6">
            <div className="h-20 w-20 rounded-3xl bg-white flex items-center justify-center text-primary font-black text-3xl shrink-0 shadow-2xl">
              {vendor.name?.charAt(0)}
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black">{vendor.name}</h2>
              <div className="flex items-center gap-3">
                <span className="text-accent text-[10px] font-bold uppercase tracking-widest">{vendor.phone}</span>
                <Badge className="bg-green-500 text-white border-none font-black text-[9px] h-5 uppercase px-2">{vendor.status}</Badge>
              </div>
            </div>
        </div>
      </div>

      <div className="space-y-6 pt-6">
         <div className="grid grid-cols-2 gap-6">
            <Card className="p-6 rounded-[2rem] border-none shadow-sm">
               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Total Liability</p>
               <p className="text-2xl font-black text-red-600 mt-1">{currencySymbol}{vendor.pendingBalance?.toLocaleString()}</p>
            </Card>
            <Card className="p-6 rounded-[2rem] border-none shadow-sm">
               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Trading Volume</p>
               <p className="text-2xl font-black text-slate-900 mt-1">{currencySymbol}{vendor.totalPurchase?.toLocaleString()}</p>
            </Card>
         </div>

         <Card className="border-none shadow-sm rounded-[2rem] p-6">
            <h2 className="text-lg font-black mb-4">Node Ledger</h2>
            <Table>
               <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Particulars</TableHead><TableHead className="text-right">Outflow (-)</TableHead><TableHead className="text-right">Inflow (+)</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
               <TableBody>
                  {calculatedLedger.map((entry: any) => (
                    <TableRow key={entry.id}>
                       <TableCell className="text-[10px] font-black text-slate-400 uppercase">{entry.date}</TableCell>
                       <TableCell className="font-bold">{entry.particulars}</TableCell>
                       <TableCell className="text-right text-green-600 font-black">{entry.type === 'debit' ? `${currencySymbol}${entry.amount.toLocaleString()}` : '-'}</TableCell>
                       <TableCell className="text-right text-red-600 font-black">{entry.type === 'credit' ? `${currencySymbol}${entry.amount.toLocaleString()}` : '-'}</TableCell>
                       <TableCell className="text-right font-black">{currencySymbol}{entry.balance.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
               </TableBody>
            </Table>
         </Card>
      </div>
    </div>
  );
}
