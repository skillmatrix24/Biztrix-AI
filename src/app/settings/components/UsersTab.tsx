
"use client";

import { useState } from "react";
import { 
  Users, 
  Plus, 
  UserPlus, 
  Mail, 
  Phone, 
  Settings, 
  Edit2, 
  X, 
  Loader2,
  Zap,
  Timer,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  SmartphoneNfc,
  ShieldCheck,
  MoreVertical,
  Trash2,
  MapPin,
  Save,
  DollarSign,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const SHIFT_HOURS = ["4", "6", "8", "9", "10", "12"];
const TIME_SLOTS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", 
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM",
  "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM"
];

const DEFAULT_ROLES = ["Admin", "Manager", "Staff", "Agent", "Accountant"];

interface UsersTabProps {
  businessId: string;
  business: any;
  businessRef: any;
  businessUsers: any[];
  currentUser: any;
  isAdmin: boolean;
  isTrialExpired: boolean;
}

export function UsersTab({ businessId, business, businessRef, businessUsers, currentUser, isAdmin, isTrialExpired }: UsersTabProps) {
  const firestore = useFirestore();
  const router = useRouter();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isManageRolesOpen, setIsManageRolesOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showEditAdvanced, setShowEditAdvanced] = useState(false);

  // Add Form State
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserAddress, setNewUserAddress] = useState("");
  const [newUserRole, setNewUserRole] = useState("Staff");
  
  // Advanced State
  const [dailyRate, setDailyRate] = useState("500");
  const [shiftHours, setShiftHours] = useState("8");
  const [shiftStart, setShiftStart] = useState("09:00 AM");
  const [shiftEnd, setShiftEnd] = useState("06:00 PM");

  // Edit Advanced State
  const [editDailyRate, setEditDailyRate] = useState("500");
  const [editShiftHours, setEditShiftHours] = useState("8");
  const [editShiftStart, setEditShiftStart] = useState("09:00 AM");
  const [editShiftEnd, setEditShiftEnd] = useState("06:00 PM");

  const [newRoleName, setNewRoleName] = useState("");

  const dynamicRoles = business?.staffRoles || DEFAULT_ROLES;

  const handleAddUser = () => {
    if (!newUserName || !newUserEmail || !businessId) return;
    const usersRef = collection(firestore, 'users');
    
    const userData = {
      name: newUserName,
      email: newUserEmail.toLowerCase(),
      phone: newUserPhone,
      address: newUserAddress,
      role: newUserRole,
      businessId: businessId,
      businessName: business?.name || "Business",
      dailyRate: parseFloat(dailyRate) || 500,
      shiftHours: parseInt(shiftHours) || 8,
      shiftTimings: `${shiftStart} - ${shiftEnd}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      dashboardLayout: [
        { id: 'hero', label: 'AI Slate', enabled: true, order: 0 },
        { id: 'pulse', label: 'Daily Pulse', enabled: true, order: 1 },
        { id: 'stats', label: 'Main Stats', enabled: true, order: 2 },
        { id: 'assistant', label: 'AI Assistant', enabled: true, order: 3 },
      ]
    };

    addDocumentNonBlocking(usersRef, userData);
    setIsAddUserOpen(false);
    resetForm();
    toast({ title: "Invite Dispatched", description: `${newUserName} has been added.` });
  };

  const resetForm = () => {
    setNewUserName(""); setNewUserEmail(""); setNewUserPhone(""); setNewUserAddress("");
    setNewUserRole("Staff"); setDailyRate("500"); setShiftHours("8");
    setShiftStart("09:00 AM"); setShiftEnd("06:00 PM"); setShowAdvanced(false);
  };

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditDailyRate(user.dailyRate?.toString() || "500");
    setEditShiftHours(user.shiftHours?.toString() || "8");
    if (user.shiftTimings && user.shiftTimings.includes(' - ')) {
      const parts = user.shiftTimings.split(' - ');
      setEditShiftStart(parts[0]);
      setEditShiftEnd(parts[1]);
    }
    setShowEditAdvanced(false);
    setIsEditUserOpen(true);
  };

  const handleUpdateUser = () => {
    if (!editingUser || !isAdmin) return;
    const userRef = doc(firestore, 'users', editingUser.id);
    updateDocumentNonBlocking(userRef, { 
      name: editingUser.name, 
      role: editingUser.role, 
      phone: editingUser.phone,
      address: editingUser.address,
      dailyRate: parseFloat(editDailyRate) || 500,
      shiftHours: parseInt(editShiftHours) || 8,
      shiftTimings: `${editShiftStart} - ${editShiftEnd}`,
      updatedAt: serverTimestamp()
    });
    setIsEditUserOpen(false);
    toast({ title: "Profile Updated" });
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser?.uid) return;
    deleteDocumentNonBlocking(doc(firestore, 'users', id));
    toast({ title: "User Erased", variant: "destructive" });
  };

  const handleAddRole = () => {
    if (!newRoleName.trim() || !businessRef) return;
    if (dynamicRoles.includes(newRoleName.trim())) return;
    updateDocumentNonBlocking(businessRef, { staffRoles: [...dynamicRoles, newRoleName.trim()] });
    setNewRoleName("");
    toast({ title: "Role Added" });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Card className="border-none shadow-md bg-white rounded-2xl border">
        <CardHeader className="bg-primary/5 border-b py-5 px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Users className="h-4 w-4" /> Team Directory
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsManageRolesOpen(true)} className="h-9 rounded-xl text-[10px] font-bold uppercase">Roles</Button>
            <Button disabled={isTrialExpired} onClick={() => setIsAddUserOpen(true)} className="h-9 rounded-xl px-6 text-[10px] font-bold uppercase bg-primary text-white">Invite Member</Button>
          </div>
        </CardHeader>
        <div className="divide-y">
          {(businessUsers || []).map((u: any) => (
            <div key={u.id} className="p-6 flex items-center justify-between hover:bg-muted/5 group transition-colors cursor-pointer" onClick={() => router.push(`/staff/${u.id}`)}>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary text-sm shadow-inner">{u.name?.charAt(0)}</div>
                <div>
                  <p className="text-sm font-bold text-slate-900 group-hover:underline">{u.name || "Pending"}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[8px] font-black h-5 uppercase">{u.role}</Badge>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={(e) => { e.stopPropagation(); handleOpenEdit(u); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                  {u.id !== currentUser?.uid && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  <ChevronRight className="h-4 w-4 text-primary ml-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-primary text-white">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl">Invite Team Member</DialogTitle>
                <DialogDescription className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-1">Configure specialist node</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
            <div className="space-y-4">
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Full Name</Label><Input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="h-11 rounded-xl" /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Email Address</Label><Input value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="h-11 rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Mobile</Label><Input value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} className="h-11 rounded-xl" /></div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Role</Label>
                  <Select value={newUserRole} onValueChange={setNewUserRole}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      {dynamicRoles.map((r: string) => <SelectItem key={r} value={r} className="text-xs font-bold uppercase">{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="pt-2">
              <Button variant="ghost" onClick={() => setShowAdvanced(!showAdvanced)} className="text-[10px] font-bold uppercase text-primary p-0 h-auto hover:bg-transparent">
                {showAdvanced ? "Hide Advanced Settings" : "Configure Payroll & Shift"} <ChevronDown className={cn("ml-1 h-3 w-3 transition-transform", showAdvanced && "rotate-180")} />
              </Button>
            </div>

            {showAdvanced && (
              <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase">Daily Rate (₹)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input type="number" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} className="h-11 pl-8 rounded-xl bg-primary/5 border-none font-bold" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase">Shift Hours</Label>
                    <Select value={shiftHours} onValueChange={setShiftHours}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {SHIFT_HOURS.map(h => <SelectItem key={h} value={h} className="text-xs font-bold">{h} Hours</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase">Shift Start</Label>
                    <Select value={shiftStart} onValueChange={setShiftStart}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {TIME_SLOTS.map(t => <SelectItem key={t} value={t} className="text-[10px]">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase">Shift End</Label>
                    <Select value={shiftEnd} onValueChange={setShiftEnd}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {TIME_SLOTS.map(t => <SelectItem key={t} value={t} className="text-[10px]">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="p-8 bg-muted/10 border-t">
            <Button onClick={handleAddUser} className="w-full h-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">Deploy Member Node</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-primary text-white">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <Edit2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl">Modify Specialist</DialogTitle>
                <p className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-1">Profile & Payroll Management</p>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
            {editingUser && (
              <div className="space-y-6">
                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">Full Name</Label><Input value={editingUser.name} onChange={(e) => setEditingUser({...editingUser, name: e.target.value})} className="h-11 rounded-xl font-bold" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">Mobile</Label><Input value={editingUser.phone || ""} onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})} className="h-11 rounded-xl" /></div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase opacity-60">System Role</Label>
                    <Select value={editingUser.role} onValueChange={(v) => setEditingUser({...editingUser, role: v})}>
                      <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {dynamicRoles.map((r: string) => <SelectItem key={r} value={r} className="text-xs font-bold uppercase">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-2">
                  <Button variant="ghost" onClick={() => setShowEditAdvanced(!showEditAdvanced)} className="text-[10px] font-bold uppercase text-primary p-0 h-auto hover:bg-transparent">
                    {showEditAdvanced ? "Hide Advanced Settings" : "Update Payroll & Shift"} <ChevronDown className={cn("ml-1 h-3 w-3 transition-transform", showEditAdvanced && "rotate-180")} />
                  </Button>
                </div>

                {showEditAdvanced && (
                  <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-top-2 border-t border-dashed">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase">Daily Rate (₹)</Label>
                        <Input type="number" value={editDailyRate} onChange={(e) => setEditDailyRate(e.target.value)} className="h-11 rounded-xl bg-primary/5 border-none font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase">Shift Hours</Label>
                        <Select value={editShiftHours} onValueChange={setEditShiftHours}>
                          <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {SHIFT_HOURS.map(h => <SelectItem key={h} value={h} className="text-xs font-bold">{h} Hours</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase">Shift Start</Label>
                        <Select value={editShiftStart} onValueChange={setEditShiftStart}>
                          <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {TIME_SLOTS.map(t => <SelectItem key={t} value={t} className="text-[10px]">{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase">Shift End</Label>
                        <Select value={editShiftEnd} onValueChange={setEditShiftEnd}>
                          <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {TIME_SLOTS.map(t => <SelectItem key={t} value={t} className="text-[10px]">{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="p-8 bg-muted/10 border-t">
            <Button onClick={handleUpdateUser} className="w-full h-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl">Commit Node Updates</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Management Dialog */}
      <Dialog open={isManageRolesOpen} onOpenChange={setIsManageRolesOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-slate-900 text-white">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-accent" />
              <DialogTitle className="text-xl">Business Roles</DialogTitle>
            </div>
            <DialogDescription className="text-slate-400 text-xs">Define custom specialist types</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="flex gap-2">
              <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="e.g. Supervisor" className="h-11 rounded-xl font-bold" />
              <Button onClick={handleAddRole} className="h-11 px-4 rounded-xl bg-primary"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {dynamicRoles.map((r: string) => (
                <Badge key={r} variant="secondary" className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-muted/30 border-none flex items-center gap-2 group">
                  {r}
                  <button onClick={() => updateDocumentNonBlocking(businessRef, { staffRoles: dynamicRoles.filter((dr: string) => dr !== r) })} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>
          <DialogFooter className="p-6 bg-muted/10">
            <Button variant="ghost" onClick={() => setIsManageRolesOpen(false)} className="w-full h-10 font-bold uppercase text-[10px] tracking-widest">Close Registry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

