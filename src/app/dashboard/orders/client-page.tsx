"use client";

import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionCard, EmptyStatePanel } from "@/components/ui/editorial";
import { Loader2, ShoppingBag } from "lucide-react";
import { format } from "date-fns";

export default function OrderDashboard() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  
  const businessId = userProfile?.businessId;

  const ordersQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'orders'), orderBy('createdAt', 'desc')) : null
  , [firestore, businessId]);
  
  const { data: orders, isLoading } = useCollection<any>(ordersQuery);

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <PageHeader
        breadcrumb="Orders"
        title="Order Dashboard"
        description="Track incoming storefront and customer orders chronologically."
      />
      {!orders || orders.length === 0 ? (
        <EmptyStatePanel
          icon={ShoppingBag}
          title="No orders recorded yet"
          description="Incoming customer and storefront orders will appear here."
        />
      ) : (
        <div className="grid gap-4">
          {orders.map((order: any) => (
            <SectionCard
              key={order.id}
              title={`Order #${order.id.slice(-6)}`}
              headerRight={<Badge variant="outline" className="text-xs font-medium">{order.status || 'Pending'}</Badge>}
            >
              <p className="text-xs font-mono tabular-nums text-slate-500">
                {order.createdAt ? format(order.createdAt.toDate(), 'PPP p') : 'N/A'}
              </p>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
