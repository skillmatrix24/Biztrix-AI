
"use client";

import { useState, useMemo } from "react";
import {
  Wallet,
  Trophy,
  Zap,
  Loader2,
  History,
  Building2,
  Handshake
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { KpiStatCard, SectionCard, EmptyStatePanel } from "@/components/ui/editorial";
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
import { toast } from "@/hooks/use-toast";

export default function MyStaffPortalPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() =>
    user?.uid ? doc(firestore, "users", user.uid) : null
  , [firestore, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const attendanceQuery = useMemoFirebase(() => {
    if (!businessId || !user?.uid) return null;
    return query(
      collection(firestore, "businesses", businessId, "attendance"),
      where("staffId", "==", user.uid)
    );
  }, [firestore, businessId, user?.uid]);
  const { data: myAttendanceData, isLoading: isAttendanceLoading } = useCollection<any>(attendanceQuery);
  const myAttendance = myAttendanceData || [];

  const requestsQuery = useMemoFirebase(() => {
    if (!businessId || !user?.uid) return null;
    return query(
      collection(firestore, "businesses", businessId, "paymentRequests"),
      where("requesterId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
  }, [firestore, businessId, user?.uid]);
  const { data: myRequests = [] } = useCollection<any>(requestsQuery);

  const tasksQuery = useMemoFirebase(() => {
    if (!businessId || !user?.uid) return null;
    return query(
      collection(firestore, "businesses", businessId, "tasks"),
      where("assignedTo", "==", user.uid),
      orderBy("createdAt", "desc")
    );
  }, [firestore, businessId, user?.uid]);
  const { data: myTasksData } = useCollection<any>(tasksQuery);
  const myTasks = myTasksData || [];

  const bizRef = useMemoFirebase(() =>
    businessId ? doc(firestore, "businesses", businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(bizRef);

  const [isRequestOpen, setIsAddOpen] = useState(false);
  const [requestAmount, setAmount] = useState("");
  const [requestPurpose, setPurpose] = useState("");

  const handleRequestFund = () => {
    if (!businessId || !user?.uid || !requestAmount || !requestPurpose) return;

    addDocumentNonBlocking(collection(firestore, "businesses", businessId, "paymentRequests"), {
      businessId,
      requesterId: user.uid,
      requesterName: profile?.name || "User",
      recipientType: "staff",
      recipientId: user.uid,
      recipientName: profile?.name || "User",
      amount: parseFloat(requestAmount),
      purpose: requestPurpose,
      status: "pending",
      createdAt: serverTimestamp()
    });

    if (business?.ownerId) {
      addDocumentNonBlocking(collection(firestore, "businesses", businessId, "notifications"), {
        businessId,
        recipientId: business.ownerId,
        title: "Staff Advance Request",
        message: `${profile?.name} requested ₹${requestAmount}: ${requestPurpose}`,
        type: "payment",
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

    const presentCount = monthRecords.filter((r: any) => r.status === "present").length;
    const halfDayCount = monthRecords.filter((r: any) => r.status === "half-day").length;

    const totalOtHours = monthRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.overtimeHours) || 0), 0);
    const totalOTEarned = totalOtHours * hourlyRate;
    const totalAllowances = monthRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.allowance) || 0), 0);

    const baseEarnings = presentCount * dailyRate + halfDayCount * (dailyRate / 2);
    const totalEarned = baseEarnings + totalOTEarned + totalAllowances;

    const totalPaid = monthRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.manualPayment) || 0), 0);
    const balance = totalEarned - totalPaid;

    const completedTasks = (myTasks || []).filter((t: any) => t.status === "completed").length;

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
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-xs font-medium text-slate-500">Loading your portal...</p>
      </div>
    );
  }

  const balanceTone = (stats?.balance || 0) > 0 ? "danger" : (stats?.balance || 0) < 0 ? "default" : "positive";

  return (
    <div className="space-y-6 pb-20">
      <div className="rounded-2xl bg-slate-900 p-6 sm:p-8 text-white">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="h-20 w-20 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white font-bold text-3xl shrink-0">
            {profile?.name?.charAt(0)}
          </div>
          <div className="space-y-1.5 text-center md:text-left flex-1 min-w-0">
            <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-medium text-slate-300">
              <span>{profile?.role || "Specialist"}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">ID: {profile?.id?.slice(-6).toUpperCase()}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{profile?.name}</h1>
            <p className="text-sm text-slate-300 flex items-center justify-center md:justify-start gap-2">
              <Building2 className="h-4 w-4" /> {business?.name || "Member Hub"}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Dialog open={isRequestOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white h-11 px-5 rounded-xl font-semibold text-sm">
                  <Handshake className="mr-2 h-4 w-4" /> Request Fund
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px] rounded-2xl border border-slate-200 p-0 overflow-hidden bg-white">
                <DialogHeader className="p-6 bg-slate-900 text-white text-left">
                  <DialogTitle className="text-lg font-bold text-white">Request Fund / Advance</DialogTitle>
                  <DialogDescription className="text-slate-300 text-xs">
                    This request will be sent to your Admin for approval.
                  </DialogDescription>
                </DialogHeader>
                <div className="p-6 space-y-5 text-left">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Requested Amount (₹)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={requestAmount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-11 rounded-xl font-mono tabular-nums font-bold text-base bg-slate-50 border-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Purpose / Reason</Label>
                    <Textarea
                      placeholder="e.g. Travel Advance / Emergency"
                      value={requestPurpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="min-h-[96px] rounded-xl bg-slate-50 border-slate-200 p-3.5 text-sm"
                    />
                  </div>
                </div>
                <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200">
                  <Button onClick={handleRequestFund} className="w-full h-11 bg-primary font-semibold text-sm rounded-xl text-white">
                    Send Request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiStatCard
          label="Month Earnings"
          value={`₹${(stats?.earned || 0).toLocaleString()}`}
          icon={Wallet}
        />
        <KpiStatCard
          label={(stats?.balance || 0) > 0 ? "Pending Due" : (stats?.balance || 0) < 0 ? "Advance Balance" : "Account Clear"}
          value={`₹${Math.abs(stats?.balance || 0).toLocaleString()}`}
          icon={History}
          tone={balanceTone}
        />
        <KpiStatCard
          label="Total Overtime"
          value={`${stats?.otHours || 0} Hours`}
          icon={Zap}
        />
        <KpiStatCard
          label="Work Efficiency"
          value={`${stats?.efficiency || 0}%`}
          icon={Trophy}
          tone="positive"
        />
      </div>

      <Tabs defaultValue="overview" className="w-full space-y-6">
        <TabsList className="bg-white border border-slate-200 h-12 p-1 rounded-xl flex overflow-x-auto scrollbar-hide">
          <TabsTrigger value="overview" className="flex-1 text-xs font-semibold px-6">
            My Profile
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex-1 text-xs font-semibold px-6">
            Fund Requests
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex-1 text-xs font-semibold px-6">
            Month Log
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex-1 text-xs font-semibold px-6">
            Assigned Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="m-0">
          <SectionCard title="Personal Workspace">
            <p className="text-sm text-slate-600 leading-relaxed">
              Welcome to your personal portal. Track your monthly earnings, submit advance requests, and review assigned tasks in real time.
            </p>
          </SectionCard>
        </TabsContent>

        <TabsContent value="requests" className="m-0 space-y-6">
          <SectionCard
            title="My Request History"
            description="Advance requests submitted to your workspace administrator"
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70">
                    <TableHead className="pl-6">Date</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right pr-6">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-sm text-slate-500">
                        No advance requests submitted yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    myRequests.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="pl-6 py-4 text-xs font-mono tabular-nums text-slate-600">
                          {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : "Recently"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-800">{r.purpose}</TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              "text-xs font-semibold capitalize",
                              r.status === "approved"
                                ? "text-emerald-700"
                                : r.status === "rejected"
                                  ? "text-rose-700"
                                  : "text-amber-700"
                            )}
                          >
                            {r.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6 font-mono tabular-nums font-bold text-sm text-slate-900">
                          ₹{r.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="attendance" className="m-0">
          <EmptyStatePanel
            title="Attendance synced with payroll"
            description="Your monthly attendance records are automatically included in your earnings statement."
          />
        </TabsContent>

        <TabsContent value="tasks" className="m-0">
          <EmptyStatePanel
            title="Task workspace"
            description="Review and update your assigned tasks from the main Workspace section."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
