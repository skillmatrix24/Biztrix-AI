"use client";

import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-black uppercase tracking-tight">Order Dashboard</h2>
      <div className="grid gap-4">
        {orders?.map((order: any) => (
          <Card key={order.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold">Order {order.id.slice(-6)}</CardTitle>
              <Badge>{order.status || 'Pending'}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{order.createdAt ? format(order.createdAt.toDate(), 'PPP p') : 'N/A'}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
