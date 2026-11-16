"use client";

import { useMemo } from "react";
import { 
  Building2, 
  Loader2, 
  DollarSign,
  Wallet
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, OverviewBanner, KpiStatCard, SectionCard, EmptyStatePanel } from "@/components/ui/editorial";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser } from "@/firebase";
import { doc, query, where, orderBy, collection } from "firebase/firestore";
import { format } from "date-fns";

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
  if (!vendor) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <PageHeader title="Supplier Profile" backHref="/vendors" backLabel="Back to Suppliers" />
        <div className="mt-6">
          <EmptyStatePanel
            icon={Building2}
            title="Supplier not found"
            description="This supplier record could not be located in your workspace."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <PageHeader
        title={vendor.name}
        breadcrumb="Suppliers / Ledger Profile"
        description={vendor.phone ? `Contact: ${vendor.phone}` : undefined}
        backHref="/vendors"
        backLabel="Back to Suppliers"
      />

      <OverviewBanner
        title={vendor.name}
        subtitle={vendor.status || "Active Supplier"}
        description={vendor.phone ? `Registered contact number: ${vendor.phone}` : "Supplier account & transaction statement"}
        icon={Building2}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <KpiStatCard
          label="Total Liability"
          value={`${currencySymbol}${(vendor.pendingBalance || 0).toLocaleString()}`}
          icon={Wallet}
          tone={(vendor.pendingBalance || 0) > 0 ? "danger" : "default"}
        />
        <KpiStatCard
          label="Trading Volume"
          value={`${currencySymbol}${(vendor.totalPurchase || 0).toLocaleString()}`}
          icon={DollarSign}
        />
      </div>

      <SectionCard
        title="Supplier Ledger"
        description="Chronological statement of opening balance, outflows, and inflows"
        headerRight={isLedgerLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : undefined}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead className="pl-6">Date</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead className="text-right">Outflow (-)</TableHead>
                <TableHead className="text-right">Inflow (+)</TableHead>
                <TableHead className="text-right pr-6">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calculatedLedger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-sm text-slate-500">
                    No ledger transactions recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                calculatedLedger.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell className="pl-6 text-xs font-mono tabular-nums text-slate-500">{entry.date}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-900">{entry.particulars}</TableCell>
                    <TableCell className={cn("text-right font-mono tabular-nums text-sm font-semibold", entry.type === 'debit' ? "text-emerald-700" : "text-slate-400")}>
                      {entry.type === 'debit' ? `${currencySymbol}${entry.amount.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className={cn("text-right font-mono tabular-nums text-sm font-semibold", entry.type === 'credit' ? "text-rose-700" : "text-slate-400")}>
                      {entry.type === 'credit' ? `${currencySymbol}${entry.amount.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="text-right pr-6 font-mono tabular-nums text-sm font-bold text-slate-900">
                      {currencySymbol}{entry.balance.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}
