"use client";

import { useEffect, useState } from "react";
import { Heart, Plus, PlusCircle, SmartphoneNfc, UserPlus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { setDocumentNonBlocking, useFirestore } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";

const CUSTOMER_TYPES = ["Regular", "VIP", "Wholesale", "Risky", "B2B"];
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Judiciary",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Chandigarh",
];

interface NewCustomerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess: (customerId: string) => void;
  businessId: string;
  currencySymbol: string;
  defaultState?: string;
}

export function NewCustomerDialog({
  isOpen,
  onOpenChange,
  onSaveSuccess,
  businessId,
  currencySymbol,
  defaultState,
}: NewCustomerDialogProps) {
  const firestore = useFirestore();
  const [activeFormTab, setActiveFormTab] = useState("basic");
  const [customerFormData, setCustomerFormData] = useState<any>({
    name: "",
    phone: "",
    email: "",
    customerType: "Regular",
    address: "",
    state: "Maharashtra",
    gstin: "",
    openingBalance: 0,
    dob: "",
    gender: "Prefer not to say",
    whatsappOptIn: true,
    isVip: false,
    primaryBirthdayConsent: false,
    events: [],
    customFields: {},
  });
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");

  useEffect(() => {
    if (isOpen && !customerFormData.id && defaultState) {
      setCustomerFormData((prev: any) => ({ ...prev, state: defaultState }));
    }
  }, [isOpen, defaultState, customerFormData.id]);

  const handleSaveCustomer = () => {
    if (!businessId || !customerFormData.name || !customerFormData.phone) return;
    const cleanPhone = customerFormData.phone.replace(/\D/g, "").slice(-10);
    const customerId = `c_${cleanPhone}`;

    setDocumentNonBlocking(
      doc(firestore, "businesses", businessId, "customers", customerId),
      {
        ...customerFormData,
        id: customerId,
        createdAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    onSaveSuccess(customerId);
    onOpenChange(false);
  };

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    setCustomerFormData((prev: any) => ({
      ...prev,
      customFields: { ...prev.customFields, [newFieldName]: newFieldValue },
    }));
    setNewFieldName("");
    setNewFieldValue("");
  };

  const addEvent = (type: "birthday" | "anniversary" | "other") => {
    setCustomerFormData((prev: any) => ({
      ...prev,
      events: [
        ...(prev.events || []),
        {
          id: Math.random().toString(36).substr(2, 9),
          type,
          label: type === "birthday" ? "Birthday" : type === "anniversary" ? "Anniversary" : "Event",
          date: "",
        },
      ],
    }));
  };

  const removeEvent = (id: string) => {
    setCustomerFormData((prev: any) => ({
      ...prev,
      events: (prev.events || []).filter((e: any) => e.id !== id),
    }));
  };

  const updateEvent = (id: string, key: string, value: string) => {
    setCustomerFormData((prev: any) => ({
      ...prev,
      events: (prev.events || []).map((e: any) => (e.id === id ? { ...e, [key]: value } : e)),
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl w-[95vw] sm:w-full z-[200] bg-white">
        <DialogHeader className="px-6 py-5 bg-slate-900 text-white text-left shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-lg font-bold text-white">New Customer</DialogTitle>
              <DialogDescription className="text-slate-300 text-xs mt-0.5">
                Add customer profile to your business registry
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeFormTab} onValueChange={setActiveFormTab} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 border-b border-slate-200 bg-slate-50 shrink-0">
            <TabsList className="bg-transparent h-11 p-0 gap-6 border-none overflow-x-auto scrollbar-hide flex">
              <TabsTrigger value="basic" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 text-xs font-semibold px-0">
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="loyalty" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 text-xs font-semibold px-0">
                Loyalty
              </TabsTrigger>
              <TabsTrigger value="messages" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 text-xs font-semibold px-0">
                Occasions &amp; Opt-in
              </TabsTrigger>
              <TabsTrigger value="custom" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 text-xs font-semibold px-0">
                Extra Fields
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 flex-1 min-h-0 overflow-y-auto">
            <TabsContent value="basic" className="m-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Full Name *</Label>
                  <Input
                    value={customerFormData.name}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                    className="h-10 rounded-lg font-medium"
                    placeholder="Enter customer name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Mobile Number *</Label>
                  <Input
                    value={customerFormData.phone}
                    onChange={(e) =>
                      setCustomerFormData({
                        ...customerFormData,
                        phone: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    className="h-10 rounded-lg font-mono tabular-nums"
                    placeholder="10-digit mobile"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Customer Type</Label>
                  <Select
                    value={customerFormData.customerType}
                    onValueChange={(v: any) =>
                      setCustomerFormData({ ...customerFormData, customerType: v })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-lg font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[300]">
                      {CUSTOMER_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs font-medium">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">GSTIN (Optional)</Label>
                  <Input
                    value={customerFormData.gstin}
                    onChange={(e) =>
                      setCustomerFormData({
                        ...customerFormData,
                        gstin: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="27AAAAA0000A1Z5"
                    className="h-10 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <Label className="text-xs font-semibold text-slate-700">Address</Label>
                <Textarea
                  value={customerFormData.address}
                  onChange={(e) =>
                    setCustomerFormData({ ...customerFormData, address: e.target.value })
                  }
                  className="min-h-[72px] rounded-lg"
                  placeholder="Street, city, PIN code"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">State</Label>
                  <Select
                    value={customerFormData.state}
                    onValueChange={(v) => setCustomerFormData({ ...customerFormData, state: v })}
                  >
                    <SelectTrigger className="h-10 rounded-lg font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 z-[300]">
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Opening Balance ({currencySymbol})
                  </Label>
                  <Input
                    type="number"
                    value={customerFormData.openingBalance}
                    onChange={(e) =>
                      setCustomerFormData({
                        ...customerFormData,
                        openingBalance: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-10 rounded-lg font-mono tabular-nums"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="loyalty" className="m-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Reward Points</Label>
                  <Input
                    type="number"
                    value={customerFormData.rewardPoints || 0}
                    onChange={(e) =>
                      setCustomerFormData({
                        ...customerFormData,
                        rewardPoints: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="h-10 rounded-lg font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Wallet Balance ({currencySymbol})
                  </Label>
                  <Input
                    type="number"
                    value={customerFormData.walletBalance || 0}
                    onChange={(e) =>
                      setCustomerFormData({
                        ...customerFormData,
                        walletBalance: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-10 rounded-lg font-mono tabular-nums"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl text-left">
                <span className="text-xs font-semibold text-slate-800">Mark as VIP Customer</span>
                <Switch
                  checked={customerFormData.isVip}
                  onCheckedChange={(v) => setCustomerFormData({ ...customerFormData, isVip: v })}
                />
              </div>
            </TabsContent>

            <TabsContent value="messages" className="m-0 space-y-5">
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-left">
                <div className="flex items-center gap-2.5">
                  <SmartphoneNfc className="h-4 w-4 text-emerald-700" />
                  <span className="text-xs font-semibold text-emerald-900">
                    WhatsApp Bills &amp; Offers Opt-in
                  </span>
                </div>
                <Switch
                  checked={customerFormData.whatsappOptIn}
                  onCheckedChange={(v) =>
                    setCustomerFormData({ ...customerFormData, whatsappOptIn: v })
                  }
                />
              </div>

              <div className="space-y-3 text-left">
                <Label className="text-xs font-semibold text-slate-700">Family Occasions</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => addEvent("birthday")} className="h-9 text-xs">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Birthday
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addEvent("anniversary")} className="h-9 text-xs">
                    <Heart className="mr-1 h-3.5 w-3.5" /> Anniversary
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addEvent("other")} className="h-9 text-xs">
                    <PlusCircle className="mr-1 h-3.5 w-3.5" /> Event
                  </Button>
                </div>
                <div className="space-y-2.5">
                  {customerFormData.events?.map((ev: any) => (
                    <div
                      key={ev.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-end gap-2.5"
                    >
                      <div className="flex-1 w-full space-y-1 text-left">
                        <Label className="text-[11px] text-slate-500">Label</Label>
                        <Input
                          value={ev.label}
                          onChange={(e) => updateEvent(ev.id, "label", e.target.value)}
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                      <div className="w-full sm:w-40 space-y-1 text-left">
                        <Label className="text-[11px] text-slate-500">Date</Label>
                        <Input
                          type="date"
                          value={ev.date}
                          onChange={(e) => updateEvent(ev.id, "date", e.target.value)}
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeEvent(ev.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="m-0 space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Field name"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="h-9 text-xs flex-1"
                />
                <Input
                  placeholder="Value"
                  value={newFieldValue}
                  onChange={(e) => setNewFieldValue(e.target.value)}
                  className="h-9 text-xs flex-1"
                />
                <Button type="button" onClick={addCustomField} variant="secondary" className="h-9 px-3 shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {Object.entries(customerFormData.customFields || {}).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 text-left"
                  >
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500">{key}</p>
                      <p className="text-xs font-medium text-slate-900">{String(value)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...customerFormData.customFields };
                        delete updated[key];
                        setCustomerFormData((prev: any) => ({ ...prev, customFields: updated }));
                      }}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-row gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-10 rounded-lg text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!customerFormData.name || !customerFormData.phone}
            onClick={handleSaveCustomer}
            className="flex-1 h-10 bg-primary hover:bg-primary/90 text-xs font-bold rounded-lg text-white"
          >
            Save Customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
