
"use client";

import { useState, useMemo } from "react";
import { 
  UserCircle, 
  Wallet, 
  CalendarCheck, 
  Trophy, 
  Clock, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  SmartphoneNfc, 
  Loader2, 
  DollarSign, 
  Timer, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  History,
  Calendar,
  Building2,
  Mail,
  Phone,
  LayoutDashboard,
  Sparkles,
  Handshake,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { 
  useFirestore, 
  useUser, 
  useDoc, 
  useCollection, 
  useMemoFirebase,
  addDocumentNonBlocking
} from "@/firebase";
import { doc, collection, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

export default function MyStaffPortalPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  // 1. Resolve Personal Profile
  const userProfileRef = useMemoFirebase(() => 
    user?.uid ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  // 2. Fetch Personal Attendance (for financials)
  const attendanceQuery = useMemoFirebase(() => {
    if (!businessId || !user?.uid) return null;
    return query(
      collection(firestore, 'businesses', businessId, 'attendance'),
      where('staffId', '==', user.uid)
    );
  }, [firestore, businessId, user?.uid]);
  const { data: myAttendanceData, isLoading: isAttendanceLoading } = useCollection<any>(attendanceQuery);
  const myAttendance = myAttendanceData || [];

  // 3. Fetch Personal Requests
  const requestsQuery = useMemoFirebase(() => {
    if (!businessId || !user?.uid) return null;
    return query(
      collection(firestore, 'businesses', businessId, 'paymentRequests'),
      where('requesterId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, businessId, user?.uid]);
  const { data: myRequests = [] } = useCollection<any>(requestsQuery);

  // 4. Fetch Assigned Tasks
  const tasksQuery = useMemoFirebase(() => {
    if (!businessId || !user?.uid) return null;
    return query(
      collection(firestore, 'businesses', businessId, 'tasks'),
      where('assignedTo', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, businessId, user?.uid]);
  const { data: myTasksData } = useCollection<any>(tasksQuery);
  const myTasks = myTasksData || [];

  // 5. Fetch Business Info
  const bizRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(bizRef);

  // Form State for Request
  const [isRequestOpen, setIsAddOpen] = useState(false);
  const [requestAmount, setAmount] = useState("");
  const [requestPurpose, setPurpose] = useState("");

  const handleRequestFund = () => {
    if (!businessId || !user?.uid || !requestAmount || !requestPurpose) return;

    addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'paymentRequests'), {
      businessId,
      requesterId: user.uid,
      requesterName: profile?.name || "User",
      recipientType: 'staff',
      recipientId: user.uid,
      recipientName: profile?.name || "User",
      amount: parseFloat(requestAmount),
      purpose: requestPurpose,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    // Notify Admin
    if (business?.ownerId) {
      addDocumentNonBlocking(collection(firestore, 'businesses', businessId, 'notifications'), {
        businessId,
        recipientId: business.ownerId,
        title: "Staff Advance Request",
        message: `${profile?.name} requested ₹${requestAmount}: ${requestPurpose}`,
        type: 'payment',
        isRead: false,
        createdAt: serverTimestamp()
      });
    }

    setIsAddOpen(false);
    setAmount("");
    setPurpose("");
    toast({ title: "Fund Requested", description: "Admin will review your request." });
  };

  const stats = useMemo(() => {
    if (!profile) return null;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthRecords = (myAttendance || []).filter((a: any) => {
      const d = new Date(a.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const dailyRate = profile.dailyRate || 500;
    const shiftHours = profile.shiftHours || 8;
    const hourlyRate = dailyRate / shiftHours;

    const presentCount = monthRecords.filter((r: any) => r.status === 'present').length;
    const halfDayCount = monthRecords.filter((r: any) => r.status === 'half-day').length;
    
    const totalOtHours = monthRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.overtimeHours) || 0), 0);
    const totalOTEarned = totalOtHours * hourlyRate;
    const totalAllowances = monthRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.allowance) || 0), 0);
    
    const baseEarnings = (presentCount * dailyRate) + (halfDayCount * (dailyRate / 2));
    const totalEarned = baseEarnings + totalOTEarned + totalAllowances;
    
    const totalPaid = monthRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.manualPayment) || 0), 0);
    const balance = totalEarned - totalPaid;

    const completedTasks = (myTasks || []).filter((t: any) => t.status === 'completed').length;

    return {
      earned: totalEarned,
      paid: totalPaid,
      balance,
      otHours: totalOtHours,
      otPay: totalOTEarned,
      daysMarked: monthRecords.length,
      completedTasks,
      totalTasks: myTasks.length,
      efficiency: myTasks.length > 0 ? Math.round((completedTasks / myTasks.length) * 100) : 0
    };
  }, [profile, myAttendance, myTasks]);

  if (isProfileLoading || isAttendanceLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Synchronizing Personal Data...</p>
      </div>
    );
  }

  const balanceColor = (stats?.balance || 0) > 0 ? "text-red-600" : (stats?.balance || 0) < 0 ? "text-indigo-600" : "text-green-600";
  const balanceBg = (stats?.balance || 0) > 0 ? "bg-red-50 border-red-100" : (stats?.balance || 0) < 0 ? "bg-indigo-50 border-indigo-100" : "bg-green-50 border-green-100";

  return (
    <div className="space-y-8 pb-20">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
          <UserCircle className="h-64 w-64 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="h-24 w-24 rounded-[2rem] bg-white border-4 border-white/20 shadow-2xl flex items-center justify-center text-primary font-black text-4xl shrink-0">
            {profile?.name?.charAt(0)}
          </div>
          <div className="space-y-2 text-center md:text-left flex-1 min-w-0">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <Badge className="bg-primary text-white border-none font-black text-[10px] uppercase h-5 px-2">{profile?.role || "Specialist"}</Badge>
              <Badge variant="outline" className="text-white/40 border-white/20 text-[9px] font-bold uppercase">ID: {profile?.id?.slice(-6).toUpperCase()}</Badge>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight truncate">{profile?.name}</h1>
            <p className="text-sm text-slate-400 font-medium flex items-center justify-center md:justify-start gap-2">
              <Building2 className="h-4 w-4" /> {business?.name || "Member Hub"}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Dialog open={isRequestOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-xl">
                  <Handshake className="mr-2 h-4 w-4" /> Request Fund
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="p-8 bg-primary text-white">
                  <DialogTitle>Request Fund / Advance</DialogTitle>
                  <DialogDescription className="text-white/70 text-xs">This request will go to Admin for approval.</DialogDescription>
                </DialogHeader>
                <div className="p-8 space-y-6">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase">Requested Amount (₹)</Label>
                    <Input type="number" placeholder="0.00" value={requestAmount} onChange={(e) => setAmount(e.target.value)} className="h-12 rounded-xl font-black text-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase">Purpose / Reason</Label>
                    <Textarea placeholder="e.g. Travel Advance / Emergency" value={requestPurpose} onChange={(e) => setPurpose(e.target.value)} className="min-h-[100px] rounded-xl bg-muted/20 border-none p-4 text-xs font-bold" />
                  </div>
                </div>
                <DialogFooter className="p-8 bg-muted/30 border-t">
                  <Button onClick={handleRequestFund} className="w-full h-14 bg-primary font-black uppercase text-[10px] tracking-widest shadow-xl rounded-xl">Send Request</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-none shadow-sm bg-white rounded-2xl p-6 border-l-4 border-l-primary">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest">Month Earnings</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-slate-900">₹{stats?.earned.toLocaleString()}</div>
        </Card>

        <Card className={cn("border-none shadow-md rounded-2xl p-6 border-l-4 transition-all", balanceBg)}>
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className={cn("text-[10px] font-bold uppercase tracking-widest", balanceColor)}>
              {(stats?.balance || 0) > 0 ? "Pending Due" : (stats?.balance || 0) < 0 ? "Advance Balance" : "Account Clear"}
            </span>
            <History className={cn("h-4 w-4", balanceColor)} />
          </div>
          <div className={cn("text-2xl font-black", balanceColor)}>₹{Math.abs(stats?.balance || 0).toLocaleString()}</div>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl p-6 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Total OT</span>
            <Zap className="h-4 w-4 text-orange-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.otHours} Hours</div>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl p-6 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between opacity-60 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Work Efficiency</span>
            <Trophy className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.efficiency}%</div>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-white border h-14 p-1.5 rounded-2xl shadow-sm mb-8 flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="overview" className="flex-1 text-[10px] font-black uppercase px-8 gap-2">My Profile</TabsTrigger>
          <TabsTrigger value="requests" className="flex-1 text-[10px] font-black uppercase px-8 gap-2">Fund Requests</TabsTrigger>
          <TabsTrigger value="attendance" className="flex-1 text-[10px] font-black uppercase px-8 gap-2">Month Log</TabsTrigger>
          <TabsTrigger value="tasks" className="flex-1 text-[10px] font-black uppercase px-8 gap-2">Assigned Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="m-0">
           <Card className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10">
              <p className="text-sm font-medium italic">Welcome to your personal operating center. Track your earnings, request funds, and manage tasks in real-time.</p>
           </Card>
        </TabsContent>

        <TabsContent value="requests" className="m-0 space-y-6">
          <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
            <CardHeader className="bg-muted/30 border-b py-5 px-8">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Handshake className="h-4 w-4" /> My Request History
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="pl-8 text-[10px] font-black uppercase">Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Purpose</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center">Status</TableHead>
                    <TableHead className="text-right pr-8 text-[10px] font-black uppercase">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myRequests.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="h-40 text-center opacity-30 italic text-sm">No requests made yet.</TableCell></TableRow>
                  ) : (
                    myRequests.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="pl-8 py-4 text-xs font-medium">
                          {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : 'Recently'}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-700 italic">"{r.purpose}"</TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn(
                            "text-[8px] font-black uppercase h-4 px-1.5 border-none",
                            r.status === 'approved' ? "bg-green-100 text-green-700" :
                            r.status === 'rejected' ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
                          )}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8 font-black text-sm text-primary">
                          ₹{r.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="m-0">
           <p className="p-8 text-center text-xs opacity-40 italic">Monthly attendance log is synchronized with your payroll.</p>
        </TabsContent>

        <TabsContent value="tasks" className="m-0">
           <p className="p-8 text-center text-xs opacity-40 italic">Review your assigned tasks in the Workspace section.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
