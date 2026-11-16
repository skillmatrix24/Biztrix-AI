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

export default function VendorDetailPage(props: { params: { vendorId: string } }) {
  const { vendorId } = props.params;
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
      particulars: 'Opening Balance',
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
  if (!vendor) return <div className="p-20 text-center text-sm text-slate-500">Vendor not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 bg-white shadow-none" aria-label="Back to vendors">
          <Link href="/vendors"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <p className="text-xs font-medium text-slate-500">Supplier Profile</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{vendor.name}</h1>
        </div>
      </div>

      <div className="p-6 sm:p-8 bg-slate-900 text-white rounded-2xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center text-slate-900 font-semibold text-2xl shrink-0">
            {vendor.name?.charAt(0)}
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight">{vendor.name}</h2>
            <div className="flex items-center gap-3">
              <span className="text-slate-300 text-xs font-mono tabular-nums">{vendor.phone}</span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium text-xs px-2.5 py-0.5">{vendor.status}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-6 rounded-2xl border border-slate-200 bg-white shadow-none">
            <p className="text-xs font-medium text-slate-500">Total Liability</p>
            <p className="text-2xl font-semibold font-mono tabular-nums text-red-600 mt-1">{currencySymbol}{vendor.pendingBalance?.toLocaleString()}</p>
          </Card>
          <Card className="p-6 rounded-2xl border border-slate-200 bg-white shadow-none">
            <p className="text-xs font-medium text-slate-500">Trading Volume</p>
            <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-1">{currencySymbol}{vendor.totalPurchase?.toLocaleString()}</p>
          </Card>
        </div>

        <Card className="border border-slate-200 bg-white shadow-none rounded-2xl p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Account Ledger</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium text-slate-500">Date</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Particulars</TableHead>
                <TableHead className="text-right text-xs font-medium text-slate-500">Outflow (-)</TableHead>
                <TableHead className="text-right text-xs font-medium text-slate-500">Inflow (+)</TableHead>
                <TableHead className="text-right text-xs font-medium text-slate-500">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calculatedLedger.map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs font-mono tabular-nums text-slate-500">{entry.date}</TableCell>
                  <TableCell className="text-sm font-medium text-slate-900">{entry.particulars}</TableCell>
                  <TableCell className="text-right text-emerald-600 font-mono tabular-nums font-medium">{entry.type === 'debit' ? `${currencySymbol}${entry.amount.toLocaleString()}` : '-'}</TableCell>
                  <TableCell className="text-right text-red-600 font-mono tabular-nums font-medium">{entry.type === 'credit' ? `${currencySymbol}${entry.amount.toLocaleString()}` : '-'}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums font-semibold text-slate-900">{currencySymbol}{entry.balance.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
