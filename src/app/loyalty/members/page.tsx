
"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  ArrowLeft, 
  ArrowRight,
  CheckCircle2, 
  Star, 
  Calendar, 
  History, 
  Loader2, 
  Filter,
  UserPlus,
  ShieldCheck,
  MoreVertical,
  SmartphoneNfc,
  Building2,
  Wallet,
  Zap,
  Ticket,
  Clock,
  Layout,
  Crown,
  X,
  PlusCircle,
  Building,
  CreditCard,
  User,
  ChevronRight,
  Receipt,
  Smartphone,
  Heart,
  Sparkles,
  Mail,
  Phone,
  BadgeCheck,
  Share2,
  AlertCircle,
  RefreshCcw,
  RefreshCcw as RefreshCcwIcon,
  Hash,
  ShieldAlert,
  IdCard,
  QrCode,
  Printer,
  Eye,
  LayoutList,
  ExternalLink,
  AlertTriangle,
  UserCheck,
  Lock,
  Gem,
  IdCard as CardIcon,
  Download,
  TrendingUp,
  Handshake,
  MessageCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useUser, 
  useDoc, 
  setDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking, 
  addDocumentNonBlocking,
  useAuth,
  setupRecaptcha,
  initiatePhoneSignIn
} from "@/firebase";
import { collection, doc, serverTimestamp, query, where, getDocs, limit, getDoc, increment, getCountFromServer, orderBy } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NewCustomerDialog } from "@/app/billing/components/NewCustomerDialog";
import Script from "next/script";
import { sendWhatsAppTemplate, sendMemberVerificationOtpAction } from "@/app/actions/whatsapp-actions";
import { calculateGST } from "@/lib/mock-db";

const TIERS_LIST = ["Silver", "Gold", "Platinum", "VIP", "Elite", "Legend"];
const MEMBERSHIP_TYPES = ["Monthly", "Quarterly", "Yearly", "Lifetime", "Trial"];
const REGISTRATION_TYPES = ["Online", "Manual", "Gifted", "Discounted"];
const DEFAULT_PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer"];

/**
 * Helper to ensure phone number has international country code (91 for India)
 */
function formatPhoneForMeta(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) clean = clean.substring(1);
  if (clean.length === 10) return `91${clean}`;
  return clean;
}

export default function MembershipsPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: userProfile } = useDoc<any>(userProfileRef);
  const businessId = userProfile?.businessId;

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business, isLoading: isBusinessLoading } = useDoc<any>(businessRef);

  const membersQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'memberships'), orderBy('startDate', 'desc')) : null
  , [firestore, businessId]);
  const { data: membersRaw, isLoading } = useCollection<any>(membersQuery);
  const members = membersRaw || [];

  const customersQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'customers') : null
  , [firestore, businessId]);
  const { data: customersRaw } = useCollection<any>(customersQuery);
  const customers = customersRaw || [];

  const tiersQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'loyaltyTiers') : null
  , [firestore, businessId]);
  const { data: tiersRaw } = useCollection<any>(tiersQuery);
  
  const tiers = useMemo(() => {
    if (!tiersRaw) return [];
    return tiersRaw
      .filter((t: any) => (t.status || '').toLowerCase() === 'active')
      .sort((a: any, b: any) => (a.minSpend || 0) - (b.minSpend || 0));
  }, [tiersRaw]);

  const referencesQuery = useMemoFirebase(() => 
    businessId ? query(collection(firestore, 'businesses', businessId, 'references'), where('status', '==', 'active')) : null
  , [firestore, businessId]);
  const { data: referencesRaw } = useCollection<any>(referencesQuery);
  const references = referencesRaw || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterFilterMode] = useState<"all" | "incomplete">("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<any>(null);

  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<any>(null);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [waFallbackLink, setWaFallbackLink] = useState("");
  const [otpDeliveryError, setOtpDeliveryError] = useState("");

  const isAdminOrStaff = useMemo(() => {
    const role = (userProfile?.role || '').toLowerCase();
    return (userProfile?.businessId === businessId) && (['admin', 'manager', 'staff', 'agent', 'accountant'].includes(role) || user?.email?.toLowerCase() === 'skillmatrix24@gmail.com');
  }, [userProfile, user, businessId]);

  const paymentModes = useMemo(() => business?.paymentModes || DEFAULT_PAYMENT_MODES, [business]);

  const eligibleCustomers = useMemo(() => {
    return (customers || []).filter(c => {
      const existingMemberNode = (members || []).find(m => m.customerId === c.id);
      if (!existingMemberNode) return true;
      return (existingMemberNode.status || '').toLowerCase() !== 'active';
    });
  }, [customers, members]);

  const [formData, setFormData] = useState({
    customerId: "",
    type: "Yearly",
    tier: "Gold",
    walletBalance: "0",
    rewardPoints: "0",
    expiryDate: "",
    manualCardNumber: "",
    paymentMode: "Cash",
    paidAmount: "",
    isGift: false,
    isDiscount: false,
    onboardingNote: "",
    referenceId: "",
    onboardedBy: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOnlinePayment = useMemo(() => {
    const mode = (formData.paymentMode || "").toLowerCase();
    return mode === 'online' || mode === 'razorpay' || mode === 'upi';
  }, [formData.paymentMode]);

  useEffect(() => {
    if (userProfile?.name && !formData.onboardedBy) {
      setFormData(prev => ({ ...prev, onboardedBy: userProfile.name }));
    }
  }, [userProfile?.name]);

  const resetForm = () => {
    setFormData({
      customerId: "",
      type: "Yearly",
      tier: "Gold",
      walletBalance: "0",
      rewardPoints: "0",
      expiryDate: "",
      manualCardNumber: "",
      paymentMode: "Cash",
      paidAmount: "",
      isGift: false,
      isDiscount: false,
      onboardingNote: "",
      referenceId: "",
      onboardedBy: userProfile?.name || ""
    });
    setOtpSent(false);
    setOtp("");
    setGeneratedOtp("");
    setIsVerified(false);
    setWaFallbackLink("");
    setOtpDeliveryError("");
  };

  const selectedTierObj = useMemo(() => tiers.find(t => t.name === formData.tier), [formData.tier, tiers]);
  
  useEffect(() => {
    if (selectedTierObj && business) {
      const mode = business.gstMode || 'exclusive';
      const breakdown = calculateGST(selectedTierObj.minSpend || 0, selectedTierObj.gstRate || 0, false, mode);
      setFormData(prev => ({ ...prev, paidAmount: breakdown.lineTotal.toString() }));
    }
  }, [selectedTierObj, business]);

  const currencySymbol = getCurrencySymbol(business?.currency || "INR");

  const filteredMembers = useMemo(() => {
    let list = (members || []).filter((m: any) => {
      const cust = customers.find(c => c.id === m.customerId);
      const search = searchTerm.toLowerCase();
      const matchesName = m.customerName?.toLowerCase().includes(search);
      const matchesCard = m.cardNumber?.toLowerCase().includes(search);
      const matchesPhone = cust?.phone?.includes(search);
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      const matchesTier = tierFilter === 'all' || m.tier === tierFilter;
      return (matchesName || matchesCard || matchesPhone) && matchesStatus && matchesTier;
    });

    if (filterMode === 'incomplete') {
      list = list.filter(m => {
        const cust = customers.find(c => c.id === m.customerId);
        return !cust?.dob || !cust?.anniversaryDate;
      });
    }

    return list;
  }, [members, searchTerm, filterMode, customers, statusFilter, tierFilter]);

  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter(m => m.status === 'active').length;
    const highValue = members.filter(m => (m.rewardPoints || 0) > 1000).length;
    const totalRevenue = members.reduce((sum, m) => sum + (parseFloat(m.paidAmount) || 0), 0);
    const expiring = members.filter(m => {
        if (!m.expiryDate) return false;
        const diff = new Date(m.expiryDate).getTime() - new Date().getTime();
        return diff > 0 && diff < (30 * 24 * 60 * 60 * 1000);
    }).length;

    return { total, active, highValue, expiring, totalRevenue };
  }, [members]);

  const handleSendOtp = async () => {
    if (!formData.customerId || !businessId) {
      toast({ variant: "destructive", title: "Target Missing", description: "Please select a customer first." });
      return;
    }
    
    const customer = customers.find((c: any) => c.id === formData.customerId);
    if (!customer?.phone) {
      toast({ variant: "destructive", title: "Registry Error", description: "Customer phone number not found in registry." });
      return;
    }

    setIsOtpLoading(true);
    setOtpDeliveryError("");
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);

      const res = await sendMemberVerificationOtpAction(
        businessId,
        customer.phone,
        customer.name,
        code
      );

      setOtpSent(true);
      if (res.waLink) setWaFallbackLink(res.waLink);

      if (res.success) {
        toast({ 
          title: "OTP Transmitted", 
          description: `Code sent to ${customer.phone} via WhatsApp.` 
        });
      } else {
        setOtpDeliveryError(res.error || "WhatsApp delivery failed");
        toast({ 
          variant: "destructive", 
          title: "WhatsApp Dispatch Alert", 
          description: res.error || "Could not deliver via Meta Cloud API. Use WhatsApp Web link or Staff Override below." 
        });
      }
    } catch (e: any) {
      console.error(e);
      setOtpDeliveryError(e.message || "Failed to dispatch verification code.");
      toast({ variant: "destructive", title: "Gateway Error", description: e.message || "Failed to dispatch verification code." });
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !generatedOtp) return;
    setIsOtpLoading(true);
    
    if (otp === generatedOtp) {
      setIsVerified(true);
      toast({ title: "Identity Confirmed", description: "Safety handshake successful." });
    } else {
      toast({ variant: "destructive", title: "Invalid Code", description: "Verification mismatch detected." });
    }
    setIsOtpLoading(false);
  };

  const handleOnboard = async () => {
    if (!formData.customerId || !businessId || !isVerified) {
      toast({ variant: "destructive", title: "Access Blocked", description: "Please verify mobile identity before issuing card." });
      return;
    }

    if (isOnlinePayment) {
      handleInitiatePayment();
      return;
    }

    setIsSubmitting(true);
    try {
      let finalCardNumber = formData.manualCardNumber.trim().toUpperCase();

      if (!finalCardNumber) {
        const coll = collection(firestore, 'businesses', businessId, 'memberships');
        const snapshot = await getCountFromServer(coll);
        const nextSeq = snapshot.data().count + 1;
        const formattedSeq = nextSeq < 10 ? `0${nextSeq}` : nextSeq.toString();

        const config = business?.cardConfig || { prefix: "BIZ" };
        finalCardNumber = `${config.prefix}-${formData.tier.toUpperCase()}-${new Date().getFullYear()}-${formattedSeq}`;
      }

      const customer = customers.find((c: any) => c.id === formData.customerId);
      const tierNode = tiers.find((t: any) => t.name.toLowerCase() === formData.tier.toLowerCase());
      
      const memberId = `mem_${formData.customerId}`; 

      const regType = formData.isGift ? 'Gifted' : formData.isDiscount ? 'Discounted' : 'Manual';

      const memberData = {
        ...formData,
        id: memberId,
        customerId: formData.customerId,
        customerName: customer?.name || 'Identity Node',
        status: 'active',
        registrationType: regType,
        startDate: new Date().toISOString(),
        walletBalance: parseFloat(formData.walletBalance) || 0,
        rewardPoints: parseInt(formData.rewardPoints) || 0,
        pointsMultiplier: parseFloat(tierNode?.pointsMultiplier) || 1,
        cashbackPercent: parseFloat(tierNode?.cashbackPercent) || 0,
        createdAt: serverTimestamp(),
        sharePublic: true,
        cardNumber: finalCardNumber,
        cardIssuedAt: new Date().toISOString(),
        isVerified: true,
        paidAmount: parseFloat(formData.paidAmount) || 0
      };

      const docRef = doc(firestore, 'businesses', businessId, 'memberships', memberId);
      await setDocumentNonBlocking(docRef, memberData, { merge: true });

      if (!formData.isGift && parseFloat(formData.paidAmount) > 0) {
        const cashbookRef = collection(firestore, 'businesses', businessId, 'cashbook');
        await addDocumentNonBlocking(cashbookRef, {
            businessId,
            type: 'credit',
            amount: parseFloat(formData.paidAmount),
            particulars: `Membership Onboarding: ${customer?.name} (${formData.tier})`,
            category: 'Sales',
            mode: formData.paymentMode,
            entryBy: formData.onboardedBy || userProfile?.name || 'Admin',
            date: new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp()
        });
      }

      if (formData.isGift && formData.referenceId && business?.defaultReferenceTemplate) {
        const refNode = (references || []).find(r => r.id === formData.referenceId);
        const waConfig = business?.whatsappApiConfig;

        if (refNode?.phone && waConfig?.isVerified) {
            const targetPhone = formatPhoneForMeta(refNode.phone);
            const components = [{
              type: "body",
              parameters: [
                { type: "text", text: refNode.name },
                { type: "text", text: customer?.name || "Client" },
                { type: "text", text: formData.tier },
                { type: "text", text: business?.name || "Our Store" },
                { type: "text", text: refNode.role || "Partner" }
              ]
            }];

            sendWhatsAppTemplate(
                businessId,
                { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
                targetPhone,
                business.defaultReferenceTemplate,
                "en_IN",
                components
            ).catch(e => {
    console.error(e);
    console.warn("Reference Notify Failed:", e);
  });
        }
      }
      
      const waConfig = business?.whatsappApiConfig;
      if (waConfig?.isVerified && customer?.phone) {
        const targetPhone = formatPhoneForMeta(customer.phone);
        const trackUrl = `${window.location.origin}/loyalty/track/${businessId}/${memberId}`;
        const templateName = waConfig.welcomeTemplateName || "welcome_member";
        const lang = waConfig.welcomeLanguageCode || "en_IN";

        const components = [{
          type: "body",
          parameters: [
            { type: "text", text: customer.name },
            { type: "text", text: finalCardNumber },
            { type: "text", text: trackUrl }
          ]
        }];

        try {
          await sendWhatsAppTemplate(
            businessId,
            { phoneId: waConfig.phoneId, accessToken: waConfig.accessToken },
            targetPhone,
            templateName,
            lang,
            components
          );
        } catch (e: any) {
    console.error(e);
          console.warn("WhatsApp welcome failed:", e);
        }
      }

      setIsAddOpen(false);
      resetForm();
      toast({ title: "Member Active", description: `Issued Card: ${finalCardNumber}.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitiatePayment = async () => {
    const customer = customers.find((c: any) => c.id === formData.customerId);
    const tierNode = tiers.find((t: any) => t.name.toLowerCase() === formData.tier.toLowerCase());
    
    if (!tierNode || !customer) {
      toast({ variant: "destructive", title: "Config Error", description: "Selected tier or customer not found." });
      return;
    }

    setIsSubmitting(true);
    try {
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          tierId: tierNode.id,
          name: customer.name,
          phone: customer.phone,
        })
      });

      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.message);

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: business?.name || "Membership Hub",
        order_id: orderData.orderId,
        handler: async (response: any) => {
          setIsSubmitting(true);
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...response,
              businessId
            })
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            toast({ title: "Payment Verified", description: "Membership node established." });
            setIsAddOpen(false);
            resetForm();
          } else {
            toast({ variant: "destructive", title: "Verification Failed", description: verifyData.message });
          }
          setIsSubmitting(false);
        },
        prefill: {
          name: customer.name,
          contact: customer.phone,
        },
        theme: { color: tierNode.color || "#0C83B3" },
        modal: {
          ondismiss: () => setIsSubmitting(false)
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
    console.error(err);
      toast({ variant: "destructive", title: "Payment Error", description: err.message });
      setIsSubmitting(false);
    }
  };

  const handleUpdateMemberNode = () => {
    if (!businessId || !memberToEdit) return;
    const docRef = doc(firestore, 'businesses', businessId, 'memberships', memberToEdit.id);
    updateDocumentNonBlocking(docRef, {
      tier: memberToEdit.tier || "Gold",
      type: memberToEdit.type || "Yearly",
      registrationType: memberToEdit.registrationType || "Manual",
      cardNumber: (memberToEdit.cardNumber || "").trim().toUpperCase(),
      walletBalance: parseFloat(memberToEdit.walletBalance) || 0,
      rewardPoints: parseInt(memberToEdit.rewardPoints) || 0,
      paidAmount: parseFloat(memberToEdit.paidAmount) || 0,
      pointsMultiplier: parseFloat(memberToEdit.pointsMultiplier) || 1,
      cashbackPercent: parseFloat(memberToEdit.cashbackPercent) || 0,
      expiryDate: memberToEdit.expiryDate || "",
      status: memberToEdit.status || "active",
      referenceId: memberToEdit.referenceId || "",
      onboardedBy: memberToEdit.onboardedBy || "",
      updatedAt: serverTimestamp()
    });
    setIsEditMemberOpen(false);
    toast({ title: "Identity Updated" });
  };

  const handleOpenEdit = (m: any) => {
    setMemberToEdit({ ...m });
    setIsEditMemberOpen(true);
  };

  const openDeleteConfirm = (e: React.MouseEvent, m: any) => {
    e.stopPropagation();
    setMemberToDelete(m);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = () => {
    if (!businessId || !memberToDelete) return;
    const docRef = doc(firestore, 'businesses', businessId, 'memberships', memberToDelete.id);
    deleteDocumentNonBlocking(docRef);
    setIsDeleteAlertOpen(false);
    setMemberToDelete(null);
    setIsDrawerOpen(false);
    toast({ title: "Member Erased", variant: "destructive" });
  };

  const handleExportCSV = () => {
    if (!payrollSummary || payrollSummary.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "Nothing to export based on filters." });
      return;
    }

    const headers = [
      "SN.", 
      "Name", 
      "Mobile Node", 
      "Card Number", 
      "Membership Tier", 
      "Registry Type", 
      "Reference Partner", 
      "Onboarded By", 
      "Paid Amount", 
      "Wallet Balance", 
      "Reward Points", 
      "Status", 
      "Onboarding Date"
    ];

    const csvRows = payrollSummary.map((m: any, index: number) => {
      const cust = (customers || []).find(c => c.id === m.customerId) || {};
      const refName = (references || []).find(r => r.id === m.referenceId)?.name || 'Direct Node';
      return [
        index + 1, 
        `"${m.customerName || 'N/A'}"`, 
        `"${cust.phone || 'N/A'}"`, 
        `"${m.cardNumber || 'N/A'}"`, 
        `"${m.tier || 'N/A'}"`, 
        `"${m.registrationType || 'Manual'}"`, 
        `"${refName}"`, 
        `"${m.onboardedBy || 'N/A'}"`, 
        m.paidAmount || 0,
        m.walletBalance || 0, 
        m.rewardPoints || 0, 
        `"${m.status || 'Active'}"`, 
        `"${m.startDate || ''}"`
      ].join(',');
    });

    const csvContent = headers.join(',') + '\n' + csvRows.join('\n');
    const fileName = `member_registry_${new Date().toISOString().split('T')[0]}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.click();
    toast({ title: "Registry Exported" });
  };

  const payrollSummary = filteredMembers;

  const isAutoAmount = formData.paymentMode.toLowerCase() === 'online' || formData.paymentMode.toLowerCase() === 'upi' || formData.paymentMode.toLowerCase() === 'razorpay';

  if (isLoading) return <div className="flex items-center justify-center py-20 text-left"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 px-2 sm:px-0 text-left">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1 text-left">
        <div className="flex items-center gap-4 text-left">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border border-border/50 shrink-0"><Link href="/loyalty"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase">Member Registry</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Identity Management Hub</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
          <Button onClick={handleExportCSV} variant="outline" className="flex-1 sm:flex-none h-11 px-6 rounded-xl border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest shadow-sm bg-white">
            <Download className="mr-2 h-4 w-4" /> Export Node
          </Button>
          <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if(!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 shadow-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-xl text-white">
                <UserPlus className="mr-2 h-4 w-4" /> Onboard Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl w-[95vw] text-left">
              <DialogHeader className="p-8 bg-primary text-white text-left shrink-0">
                <div className="flex items-center gap-4 text-left">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <DialogTitle className="text-xl font-bold">Issue Membership Card</DialogTitle>
                    <DialogDescription className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-1">Activate digital identity node</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="p-8 space-y-6 text-left">
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between mb-1.5 text-left">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Select Registered Customer</Label>
                      <Button variant="ghost" size="sm" onClick={() => setIsNewCustomerOpen(true)} className="h-6 px-2 text-[8px] font-black uppercase text-primary gap-1 hover:bg-primary/5">
                        <UserPlus className="h-3 w-3" /> Add New Customer
                      </Button>
                    </div>
                    <Select value={formData.customerId} onValueChange={(v) => setFormData({...formData, customerId: v})}>
                      <SelectTrigger className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner text-left"><SelectValue placeholder="Pick Identity..." /></SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-2xl z-[300]">
                        {eligibleCustomers.map((c: any) => (
                          <SelectItem key={c.id} value={c.id} className="text-sm font-medium">{c.name} ({c.phone})</SelectItem>
                        ))}
                        {eligibleCustomers.length === 0 && <SelectItem value="none" disabled>All customers are active members</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-primary/20 space-y-4 animate-in slide-in-from-top-2 text-left">
                     <div className="flex items-center justify-between text-left">
                        <div className="flex items-center gap-3">
                           <ShieldCheck className="h-4 w-4 text-primary" />
                           <span className="text-[9px] font-black uppercase text-primary">Safety Handshake</span>
                        </div>
                        {isVerified && <Badge className="bg-green-600 text-white text-[7px] font-black h-4 px-1.5 uppercase">Identity Confirmed</Badge>}
                     </div>

                     {!otpSent ? (
                       <Button 
                         onClick={handleSendOtp} 
                         disabled={isOtpLoading || !formData.customerId || isVerified} 
                         variant="outline" 
                         className="w-full h-12 rounded-xl bg-white text-primary border-primary/20 font-black uppercase text-[10px] shadow-sm hover:bg-primary/5"
                       >
                         {isOtpLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <SmartphoneNfc className="h-4 w-4 mr-2" />}
                         Send OTP via WhatsApp
                       </Button>
                     ) : !isVerified ? (
                       <div className="space-y-4 animate-in zoom-in-95 text-center">
                          <Label className="text-[8px] font-black uppercase text-center block tracking-[0.4em] opacity-40">Enter 6-Digit Code</Label>
                          <div className="flex gap-2">
                            <Input 
                              value={otp} 
                              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                              maxLength={6} 
                              placeholder="------"
                              className="h-11 rounded-xl bg-white text-center font-black tracking-widest text-lg flex-1 border shadow-inner" 
                            />
                            <Button onClick={handleVerifyOtp} disabled={isOtpLoading || otp.length < 6} className="h-11 px-5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] shadow-sm">
                              {isOtpLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify"}
                            </Button>
                          </div>

                          {otpDeliveryError && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-left space-y-1">
                              <p className="text-[9px] font-bold text-amber-900 flex items-center gap-1.5">
                                <AlertCircle className="h-3 w-3 text-amber-600 shrink-0" />
                                WhatsApp Dispatch Notice
                              </p>
                              <p className="text-[9px] text-amber-800 leading-snug break-words">
                                {otpDeliveryError}
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-dashed">
                            {waFallbackLink && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(waFallbackLink, '_blank')}
                                className="h-8 px-3 rounded-lg text-green-700 border-green-300 bg-green-50/50 hover:bg-green-100 font-bold text-[9px] uppercase gap-1"
                              >
                                <MessageCircle className="h-3.5 w-3.5 text-green-600" /> Send via WhatsApp Web
                              </Button>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleSendOtp}
                              disabled={isOtpLoading}
                              className="h-8 px-2 text-[9px] font-bold text-primary hover:bg-primary/5 uppercase ml-auto"
                            >
                              {isOtpLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCcw className="h-3 w-3 mr-1" />}
                              Resend OTP
                            </Button>
                          </div>

                          {isAdminOrStaff && generatedOtp && (
                            <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                              <div className="text-left">
                                <p className="text-[8px] font-black uppercase text-primary/70 tracking-widest">Staff Override Code</p>
                                <p className="text-xs font-mono font-black text-primary tracking-widest">{generatedOtp}</p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setOtp(generatedOtp);
                                  setIsVerified(true);
                                  toast({ title: "Staff Override Verified", description: "Identity confirmed via staff authorization." });
                                }}
                                className="h-7 px-2.5 text-[8px] font-black uppercase rounded-lg border-primary/20 text-primary bg-white hover:bg-primary/10 shadow-xs"
                              >
                                Auto-Fill & Verify
                              </Button>
                            </div>
                          )}
                       </div>
                     ) : (
                       <div className="flex items-center justify-center gap-2 p-3 bg-green-600 rounded-xl shadow-lg animate-in zoom-in">
                          <CheckCircle2 className="h-5 w-5 text-white" />
                          <span className="text-[10px] font-black uppercase text-white">Identity Secured</span>
                       </div>
                     )}
                  </div>

                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-primary ml-1 flex items-center gap-2"><IdCard className="h-3 w-3" /> Card Number</Label>
                    <Input value={formData.manualCardNumber} onChange={(e) => setFormData({...formData, manualCardNumber: e.target.value})} placeholder="e.g. SN-9921-XXXX" className="h-12 rounded-xl font-black text-lg bg-primary/5 border-primary/10 tracking-widest border-none shadow-inner" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Tier Level</Label>
                      <Select value={formData.tier} onValueChange={(v) => setFormData({...formData, tier: v})}>
                        <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl z-[300]">{TIERS_LIST.map(t => <SelectItem key={t} value={t} className="text-[10px] font-bold uppercase">{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 text-left">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Plan Cycle</Label>
                      <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                        <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl z-[300]">{MEMBERSHIP_TYPES.map(t => <SelectItem key={t} value={t} className="text-[10px] font-bold uppercase">{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="space-y-2 text-left">
                      <Label className="text-[10px] font-black uppercase text-primary ml-1 flex items-center gap-2"><CreditCard className="h-3 w-3" /> Settlement Method</Label>
                      <Select value={formData.paymentMode} onValueChange={(v) => setFormData({...formData, paymentMode: v})}>
                        <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold"><SelectValue placeholder="Method" /></SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl z-[300]">
                          {paymentModes.map((m: string) => <SelectItem key={m} value={m} className="text-[10px] font-bold uppercase">{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase text-primary ml-1">Payment Amount ({currencySymbol})</Label>
                        <Input 
                            type="number" 
                            value={formData.paidAmount} 
                            readOnly={isAutoAmount}
                            onChange={(e) => setFormData({...formData, paidAmount: e.target.value})} 
                            className={cn("h-11 rounded-xl font-black", isAutoAmount ? "bg-primary/5 text-primary" : "bg-muted/20")} 
                        />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Opening Wallet (₹)</Label><Input type="number" value={formData.walletBalance} onChange={(e) => setFormData({...formData, walletBalance: e.target.value})} className="h-11 rounded-xl font-bold bg-green-50/50" /></div>
                    <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Opening Points</Label><Input type="number" value={formData.rewardPoints} onChange={(e) => setFormData({...formData, rewardPoints: e.target.value})} className="h-11 rounded-xl font-bold bg-primary/5" /></div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="flex items-center justify-between p-3 bg-muted/10 rounded-xl border border-transparent hover:border-primary/20 transition-all">
                        <div className="space-y-0.5 text-left"><Label className="text-[10px] font-black uppercase text-primary">Gift Node</Label><p className="text-[7px] font-bold text-muted-foreground uppercase">Complimentary Card</p></div>
                        <Switch checked={formData.isGift} onCheckedChange={(v) => setFormData({...formData, isGift: v})} className="scale-75 data-[state=checked]:bg-primary" />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/10 rounded-xl border border-transparent hover:border-primary/20 transition-all">
                        <div className="space-y-0.5 text-left"><Label className="text-[10px] font-black uppercase text-primary">Special Disc.</Label><p className="text-[7px] font-bold text-muted-foreground uppercase">Rate Override</p></div>
                        <Switch checked={formData.isDiscount} onCheckedChange={(v) => setFormData({...formData, isDiscount: v})} className="scale-75 data-[state=checked]:bg-primary" />
                      </div>
                    </div>

                    {formData.isGift && (
                      <div className="space-y-6 animate-in slide-in-from-top-2">
                        <Separator />
                        <div className="space-y-4">
                           <div className="flex items-center gap-3 text-left">
                              <Handshake className="h-4 w-4 text-indigo-600" />
                              <Label className="text-[10px] font-black uppercase text-indigo-900 tracking-widest">Gift Reference Protocol</Label>
                           </div>
                           <div className="space-y-3 text-left">
                             <Label className="text-[9px] font-bold uppercase opacity-60">Select Reference Partner</Label>
                             <Select value={formData.referenceId} onValueChange={(v) => setFormData({...formData, referenceId: v})}>
                                <SelectTrigger className="h-12 rounded-xl bg-white font-bold"><SelectValue placeholder="Choose Reference..." /></SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl z-[300]">
                                   {references.map((r: any) => <SelectItem key={r.id} value={r.id} className="text-xs">{r.name} ({r.role})</SelectItem>)}
                                   {references.length === 0 && <SelectItem value="none" disabled>No partners in registry</SelectItem>}
                                </SelectContent>
                             </Select>
                           </div>
                        </div>
                      </div>
                    )}

                    <Separator />
                    <div className="space-y-2 text-left">
                       <Label className="text-[10px] font-black uppercase text-primary ml-1 flex items-center gap-2"><UserCheck className="h-3 w-3" /> Member Registered By (Manual)</Label>
                       <Input value={formData.onboardedBy} onChange={(e) => setFormData({...formData, onboardedBy: e.target.value})} placeholder="Staff Name" className="h-12 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
                    </div>

                    {(formData.isGift || formData.isDiscount) && (
                      <div className="space-y-1.5 animate-in slide-in-from-top-2 text-left">
                        <Label className="text-[9px] font-black uppercase text-primary ml-1">Onboarding Protocol Note</Label>
                        <Textarea 
                          value={formData.onboardingNote} 
                          onChange={(e) => setFormData({...formData, onboardingNote: e.target.value})} 
                          placeholder="Why was this card gifted or discounted?" 
                          className="min-h-[100px] rounded-xl bg-primary/5 border-none shadow-inner p-3 text-xs" 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="p-8 bg-muted/10 border-t shrink-0">
                <Button onClick={handleOnboard} disabled={isSubmitting || !formData.customerId || !isVerified} className="w-full h-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl text-white">
                  {isSubmitting ? <Loader2 className="h-8 w-8 animate-spin mr-2" /> : isOnlinePayment ? <><CreditCard className="h-4 w-4 mr-2" /> Proceed to Payment</> : "Issue Digital Card"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-1 text-left">
         <Card className="border-none shadow-sm bg-white rounded-2xl p-4 sm:p-5 border-l-4 border-l-primary text-left">
            <div className="flex items-center justify-between opacity-60"><span className="text-[8px] font-black uppercase tracking-widest">Total Members</span><Users className="h-3.5 w-3.5" /></div>
            <div className="text-xl font-black text-slate-900 mt-1">{stats.total} Nodes</div>
         </Card>
         <Card className="border-none shadow-sm bg-white rounded-2xl p-4 sm:p-5 border-l-4 border-l-green-500 text-left">
            <div className="flex items-center justify-between opacity-60"><span className="text-[8px] font-black uppercase tracking-widest">Active nodes</span><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /></div>
            <div className="text-xl font-black text-green-700 mt-1">{stats.active} Members</div>
         </Card>
         <Card className="border-none shadow-sm bg-white rounded-2xl p-4 sm:p-5 border-l-4 border-l-primary/50 text-left">
            <div className="flex items-center justify-between opacity-60"><span className="text-[8px] font-black uppercase tracking-widest">Revenue Node</span><TrendingUp className="h-3.5 w-3.5" /></div>
            <div className="text-xl font-black text-primary mt-1">{currencySymbol}{stats.totalRevenue.toLocaleString()}</div>
         </Card>
         <Card className="border-none shadow-sm bg-slate-900 text-white rounded-2xl p-4 sm:p-5 text-left">
            <div className="flex items-center justify-between opacity-40"><span className="text-[8px] font-black uppercase tracking-widest">High Value</span><Gem className="h-3.5 w-3.5 text-accent" /></div>
            <div className="text-xl font-black text-white mt-1">{stats.highValue} Elite</div>
         </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
        <div className="p-4 border-b bg-muted/20 flex flex-col xl:flex-row gap-4 items-center justify-between rounded-t-[2rem]">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
            <Select value={filterMode} onValueChange={(v: any) => setFilterFilterMode(v)}>
              <SelectTrigger className="h-10 w-full md:w-44 rounded-xl bg-white border-none shadow-sm text-[10px] font-black uppercase text-primary text-left"><SelectValue placeholder="Registry Flow" /></SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-2xl z-[300]"><SelectItem value="all" className="text-[10px] font-bold uppercase">All Identities</SelectItem><SelectItem value="incomplete" className="text-[10px] font-bold uppercase text-orange-600">Profiles needing Info</SelectItem></SelectContent>
            </Select>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="h-10 flex-1 sm:w-32 rounded-xl bg-white border-none shadow-sm text-[10px] font-black uppercase text-primary text-left"><SelectValue placeholder="All Tiers" /></SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl z-[300]"><SelectItem value="all" className="text-[10px] font-bold uppercase">All Tiers</SelectItem>{TIERS_LIST.map(t => <SelectItem key={t} value={t} className="text-[10px] font-bold uppercase">{t}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 flex-1 sm:w-32 rounded-xl bg-white border-none shadow-sm text-[10px] font-black uppercase text-primary text-left"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl z-[300]"><SelectItem value="all" className="text-[10px] font-bold uppercase">All Status</SelectItem><SelectItem value="active" className="text-[10px] font-bold uppercase text-green-600">Active</SelectItem><SelectItem value="expired" className="text-[10px] font-bold uppercase text-red-600">Expired</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="relative flex-1 w-full xl:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input placeholder="Search name, phone or card ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 pl-10 rounded-xl bg-white border-none shadow-inner text-xs font-bold w-full" />
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow className="bg-muted/10">
                <TableHead className="w-12 pl-8">
                   <div className="h-4 w-4" />
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Member Node</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Level</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Registry Type</TableHead>
                <TableHead className="text-[10px] font-black uppercase h-12">Reference</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Paid Amt</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Wallet</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Points</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase h-12">Status</TableHead>
                <TableHead className="text-right pr-8 h-12 w-48"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="h-40 text-center opacity-30 italic text-sm uppercase">No active members found.</TableCell></TableRow>
              ) : filteredMembers.map((m: any) => {
                const cust = (customers || []).find(c => c.id === m.customerId);
                const isNeedInfo = !cust?.dob || !cust?.anniversaryDate;
                const ref = (references || []).find(r => r.id === m.referenceId);

                return (
                  <TableRow key={m.id} className="group hover:bg-muted/5 transition-colors border-b cursor-pointer" onClick={() => { setSelectedMember(m); setIsDrawerOpen(true); }}>
                    <TableCell className="pl-8 py-5">
                       <div className="h-4 w-4" />
                    </TableCell>
                    <TableCell className="py-5">
                      <div className="flex items-center gap-4 text-left">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs shadow-inner shrink-0">{m.customerName?.charAt(0)}</div>
                        <div className="min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-slate-900 truncate">{m.customerName}</p>
                            {isNeedInfo && <AlertTriangle className="h-3 w-3 text-orange-500" title="Profile Incomplete" />}
                          </div>
                          <p className="text-[8px] font-mono text-primary/60 truncate">{m.cardNumber}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-primary/20 text-primary">{m.tier}</Badge></TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[8px] font-black uppercase h-4 px-1.5 border-none shadow-sm",
                        m.registrationType === 'Online' ? "bg-blue-100 text-blue-700" :
                        m.registrationType === 'Gifted' ? "bg-purple-100 text-purple-700" :
                        m.registrationType === 'Discounted' ? "bg-orange-100 text-orange-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {m.registrationType || 'Manual'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                       <span className="text-[10px] font-bold text-slate-500 uppercase">{ref ? ref.name : "Direct Node"}</span>
                    </TableCell>
                    <TableCell className="text-center font-black text-sm text-blue-600">₹{m.paidAmount?.toLocaleString() || 0}</TableCell>
                    <TableCell className="text-center font-black text-sm text-green-600">₹{m.walletBalance?.toLocaleString() || 0}</TableCell>
                    <TableCell className="text-center font-black text-sm text-primary">{m.rewardPoints?.toLocaleString()} Pts</TableCell>
                    <TableCell className="text-center"><Badge className={cn("text-[8px] font-black uppercase h-4 px-1.5 border-none shadow-sm", m.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600")}>{m.status}</Badge></TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-primary hover:bg-primary/5 shadow-sm" onClick={(e) => { e.stopPropagation(); if(isAdminOrStaff) { window.open(`/loyalty/track/${businessId}/${m.id}`, '_blank'); } }} title="Open Tracking Portal"><ExternalLink className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-primary" onClick={(e) => { e.stopPropagation(); handleOpenEdit(m); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive" onClick={(e) => openDeleteConfirm(e, m)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col border-none shadow-2xl overflow-hidden bg-background text-left">
          <SheetHeader className="sr-only"><SheetTitle>{selectedMember?.customerName || 'Member Identity'}</SheetTitle><SheetDescription>View digital member card details, rewards balance, and transaction history.</SheetDescription></SheetHeader>
          {selectedMember && (
            <>
              <div className="p-8 bg-primary text-white shrink-0 relative text-left">
                <div className="absolute top-0 right-0 p-8 opacity-10"><IdCard className="h-40 w-40" /></div>
                <div className="text-left space-y-6 relative z-10">
                    <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-white/10 text-white border-white/20 uppercase text-[9px] font-black px-3 py-1">NODE ID: {selectedMember.id.slice(-8).toUpperCase()}</Badge>
                    <div className="flex gap-2"><Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 border-none text-white" onClick={(e) => { e.stopPropagation(); handleOpenEdit(selectedMember); }}><Edit2 className="h-4 w-4 text-white" /></Button></div>
                  </div>
                  <div className="flex items-center gap-6 text-left">
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-[1.5rem] bg-white flex items-center justify-center text-primary font-black text-2xl sm:text-3xl shrink-0 shadow-2xl">{selectedMember.customerName?.charAt(0)}</div>
                    <div className="space-y-1 min-w-0 text-left"><SheetTitle className="text-xl sm:text-2xl font-black text-white truncate">{selectedMember.customerName}</SheetTitle><p className="text-accent text-[10px] font-bold uppercase tracking-widest">{selectedMember.cardNumber}</p></div>
                  </div>
                </div>
              </div>
              <ScrollArea className="flex-1 p-6 sm:p-8 scrollbar-hide text-left">
                <div className="space-y-10 text-left">
                  <section className="space-y-6 text-left">
                      <div className="flex items-center gap-3 text-left"><Layout className="h-4 w-4 text-primary" /><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Identity Overview</h4></div>
                      <div className="grid grid-cols-2 gap-4 md:gap-6 text-left">
                        <div className="p-5 bg-muted/20 rounded-2xl border border-transparent space-y-1 text-left"><p className="text-[8px] font-bold text-muted-foreground uppercase">Reward Wallet</p><p className="text-lg font-black text-primary">{selectedMember.rewardPoints?.toLocaleString() || 0} Pts</p></div>
                        <div className="p-5 bg-muted/20 rounded-2xl border border-transparent space-y-1 text-left"><p className="text-[8px] font-bold text-muted-foreground uppercase">Cashback Balance</p><p className="text-xl font-black text-green-600">₹{selectedMember.walletBalance?.toLocaleString() || 0}</p></div>
                      </div>
                  </section>
                </div>
              </ScrollArea>
              <div className="p-6 sm:p-8 border-t bg-muted/20 flex gap-3 shrink-0"><Button asChild className="flex-1 h-14 bg-primary font-black shadow-xl uppercase tracking-widest text-[11px] gap-2 rounded-2xl text-white"><Link href={`/billing?customerId=${selectedMember.customerId}`}><Receipt className="h-5 w-5" /> New POS Bill</Link></Button></div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isEditMemberOpen} onOpenChange={setIsEditMemberOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden text-left w-[95vw]">
          <DialogHeader className="p-8 bg-slate-900 text-white text-left shrink-0">
            <div className="flex items-center gap-4 text-left">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner shrink-0"><Edit2 className="h-6 w-6 text-accent" /></div><div className="text-left"><DialogTitle className="text-xl font-bold">Modify Identity Node</DialogTitle><p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Full Protocol Edit</p></div></div>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh]">
            <div className="p-8 space-y-8 text-left">
              {memberToEdit && (
                <>
                  <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-primary ml-1 flex items-center gap-2"><IdCard className="h-3 w-3" /> Card Number</Label><Input value={memberToEdit.cardNumber || ""} onChange={(e) => setMemberToEdit({...memberToEdit, cardNumber: e.target.value})} className="h-12 rounded-xl font-black text-lg bg-primary/5 border-primary/10 tracking-widest border-none shadow-inner" /></div>
                  
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Tier Level</Label><Select value={memberToEdit.tier || "Gold"} onValueChange={(v) => setMemberToEdit({...memberToEdit, tier: v})}><SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue placeholder="Select Tier" /></SelectTrigger><SelectContent className="rounded-xl border-none shadow-2xl z-[300]">{TIERS_LIST.map(t => <SelectItem key={t} value={t} className="text-[10px] font-bold uppercase">{t}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Registry Type</Label><Select value={memberToEdit.registrationType || "Manual"} onValueChange={(v) => setMemberToEdit({...memberToEdit, registrationType: v})}><SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{REGISTRATION_TYPES.map(t => <SelectItem key={t} value={t} className="text-[10px] font-bold uppercase">{t}</SelectItem>)}</SelectContent></Select></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Plan Cycle</Label>
                        <Select value={memberToEdit.type || "Yearly"} onValueChange={(v) => setMemberToEdit({...memberToEdit, type: v})}>
                            <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl">{MEMBERSHIP_TYPES.map(t => <SelectItem key={t} value={t} className="text-[10px] font-bold uppercase">{t}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Node Status</Label><Select value={memberToEdit.status || "active"} onValueChange={(v) => setMemberToEdit({...memberToEdit, status: v})}><SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="active" className="text-xs font-bold uppercase text-green-600">Active</SelectItem><SelectItem value="suspended" className="text-xs font-bold uppercase text-red-600">Suspended</SelectItem><SelectItem value="lost" className="text-xs font-bold uppercase text-red-600">Lost</SelectItem></SelectContent></Select></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Paid Amount ({currencySymbol})</Label><Input type="number" value={memberToEdit.paidAmount || 0} onChange={(e) => setMemberToEdit({...memberToEdit, paidAmount: e.target.value})} className="h-11 rounded-xl font-bold" /></div>
                    <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Wallet (₹)</Label><Input type="number" value={memberToEdit.walletBalance || 0} onChange={(e) => setMemberToEdit({...memberToEdit, walletBalance: e.target.value})} className="h-11 rounded-xl font-bold bg-green-50/50" /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Reward Pts</Label><Input type="number" value={memberToEdit.rewardPoints || 0} onChange={(e) => setMemberToEdit({...memberToEdit, rewardPoints: e.target.value})} className="h-11 rounded-xl font-bold bg-primary/5" /></div>
                    <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Expiry Date</Label><Input type="date" value={memberToEdit.expiryDate || ""} onChange={(e) => setMemberToEdit({...memberToEdit, expiryDate: e.target.value})} className="h-11 rounded-xl font-bold" /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Multiplier (X)</Label><Input type="number" step="0.1" value={memberToEdit.pointsMultiplier || 1} onChange={(e) => setMemberToEdit({...memberToEdit, pointsMultiplier: e.target.value})} className="h-11 rounded-xl font-bold bg-muted/20" /></div>
                    <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cashback (%)</Label><Input type="number" value={memberToEdit.cashbackPercent || 0} onChange={(e) => setMemberToEdit({...memberToEdit, cashbackPercent: e.target.value})} className="h-11 rounded-xl font-bold bg-muted/20" /></div>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-primary ml-1 flex items-center gap-2"><Handshake className="h-3 w-3" /> Linked Reference Node</Label>
                    <Select value={memberToEdit.referenceId || "none"} onValueChange={(v) => setMemberToEdit({...memberToEdit, referenceId: v === 'none' ? "" : v})}>
                        <SelectTrigger className="h-12 rounded-xl bg-white font-bold shadow-sm"><SelectValue placeholder="No Reference" /></SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl z-[300]">
                            <SelectItem value="none" className="text-xs uppercase font-bold">Direct (No Ref)</SelectItem>
                            {references.map((r: any) => <SelectItem key={r.id} value={r.id} className="text-xs">{r.name} ({r.role})</SelectItem>)}
                        </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-primary ml-1 flex items-center gap-2"><UserCheck className="h-3 w-3" /> Registered By (Staff Name)</Label>
                    <Input value={memberToEdit.onboardedBy || ""} onChange={(e) => setMemberToEdit({...memberToEdit, onboardedBy: e.target.value})} className="h-12 rounded-xl font-bold bg-muted/10 border-none shadow-inner" />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="p-8 bg-muted/10 border-t"><Button onClick={handleUpdateMemberNode} className="w-full h-14 bg-primary font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl text-white">Commit Node Updates</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8 text-left w-[90vw] sm:w-full">
          <AlertDialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-4"><ShieldAlert className="h-6 w-6" /></div>
            <AlertDialogTitle className="text-xl font-black">Erase Member Node?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-slate-500 leading-relaxed text-left">Are you sure you want to permanently remove <span className="font-bold text-slate-900">"{memberToDelete?.customerName}"</span>? This will revoke their digital identity and all accumulated points/wallet balance. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex flex-col sm:flex-row gap-3 text-left"><AlertDialogCancel asChild><Button variant="outline" className="w-full sm:flex-1 h-12 rounded-xl font-bold uppercase text-[10px]">Cancel</Button></AlertDialogCancel><AlertDialogAction asChild><Button onClick={confirmDelete} className="flex-1 h-12 rounded-xl font-black uppercase bg-destructive hover:bg-destructive/90 text-white border-none shadow-lg text-[10px]">Erase Now</Button></AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NewCustomerDialog isOpen={isNewCustomerOpen} onOpenChange={setIsNewCustomerOpen} onSaveSuccess={(cid) => { setFormData({...formData, customerId: cid}); setIsNewCustomerOpen(false); }} businessId={businessId!} currencySymbol={currencySymbol} defaultState={business?.defaultState || business?.state} />
    </div>
  );
}
