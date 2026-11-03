
"use client";

import { useState, useEffect } from "react";
import { UserPlus, User, Heart, SmartphoneNfc, Plus, PlusCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useFirestore, setDocumentNonBlocking } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";

const CUSTOMER_TYPES = ["Regular", "VIP", "Wholesale", "Risky", "B2B"];
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Judiciary", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Chandigarh"
];

interface NewCustomerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess: (customerId: string) => void;
  businessId: string;
  currencySymbol: string;
  defaultState?: string;
}

export function NewCustomerDialog({ isOpen, onOpenChange, onSaveSuccess, businessId, currencySymbol, defaultState }: NewCustomerDialogProps) {
  const firestore = useFirestore();
  const [activeFormTab, setActiveFormTab] = useState("basic");
  const [customerFormData, setCustomerFormData] = useState<any>({
    name: "", phone: "", email: "", customerType: "Regular", address: "", state: "Maharashtra", gstin: "", 
    openingBalance: 0, dob: "", gender: "Prefer not to say", whatsappOptIn: true, isVip: false, primaryBirthdayConsent: false, events: [], customFields: {}
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
    
    // UNIFIED ID LOGIC: Use last 10 digits of phone for consistency with online portal
    const cleanPhone = customerFormData.phone.replace(/\D/g, '').slice(-10);
    const customerId = `c_${cleanPhone}`;
    
    setDocumentNonBlocking(doc(firestore, 'businesses', businessId, 'customers', customerId), { 
      ...customerFormData, 
      id: customerId, 
      createdAt: new Date().toISOString(), 
      updatedAt: serverTimestamp() 
    }, { merge: true });
    
    onSaveSuccess(customerId);
    onOpenChange(false);
  };

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    setCustomerFormData((prev: any) => ({ ...prev, customFields: { ...prev.customFields, [newFieldName]: newFieldValue } }));
    setNewFieldName(""); setNewFieldValue("");
  };

  const addEvent = (type: 'birthday' | 'anniversary' | 'other') => {
    setCustomerFormData((prev: any) => ({ ...prev, events: [...(prev.events || []), { id: Math.random().toString(36).substr(2, 9), type, label: type === 'birthday' ? "Birthday" : type === 'anniversary' ? "Anniversary" : "Event", date: "" }] }));
  };

  const removeEvent = (id: string) => {
    setCustomerFormData((prev: any) => ({ ...prev, events: (prev.events || []).filter((e: any) => e.id !== id) }));
  };

  const updateEvent = (id: string, key: string, value: string) => {
    setCustomerFormData((prev: any) => ({ ...prev, events: (prev.events || []).map((e: any) => e.id === id ? { ...e, [key]: value } : e) }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl w-[95vw] sm:w-full z-[200]">
        <DialogHeader className="p-6 sm:p-8 bg-primary text-white text-left">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0 shadow-inner"><UserPlus className="h-6 w-6 text-white" /></div>
            <div className="text-left">
              <DialogTitle className="text-xl font-black">New Customer Profile</DialogTitle>
              <DialogDescription className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-1">Registry Data Establishment</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <Tabs value={activeFormTab} onValueChange={setActiveFormTab} className="w-full">
          <div className="px-6 sm:px-8 border-b bg-muted/10">
            <TabsList className="bg-transparent h-12 p-0 gap-6 border-none overflow-x-auto scrollbar-hide flex">
              <TabsTrigger value="basic" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 text-[10px] font-black uppercase tracking-widest px-0">Basic Info</TabsTrigger>
              <TabsTrigger value="loyalty" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 text-[10px] font-black uppercase tracking-widest px-0">Loyalty</TabsTrigger>
              <TabsTrigger value="messages" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 text-[10px] font-black uppercase tracking-widest px-0">Messages</TabsTrigger>
              <TabsTrigger value="custom" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 text-[10px] font-black uppercase tracking-widest px-0">Custom Extra</TabsTrigger>
            </TabsList>
          </div>
          <div className="p-6 sm:p-8 max-h-[50vh] overflow-y-auto scrollbar-hide">
            <TabsContent value="basic" className="m-0 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Full Name *</Label><Input value={customerFormData.name} onChange={(e) => setCustomerFormData({...customerFormData, name: e.target.value})} className="h-11 rounded-xl font-bold bg-muted/20 border-none shadow-inner" placeholder="Enter Name" /></div>
                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Mobile Number *</Label><Input value={customerFormData.phone} onChange={(e) => setCustomerFormData({...customerFormData, phone: e.target.value.replace(/\D/g, '')})} className="h-11 rounded-xl font-bold bg-muted/20 border-none shadow-inner" placeholder="91XXXXXXXX" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Customer Category</Label>
                  <Select value={customerFormData.customerType} onValueChange={(v: any) => setCustomerFormData({...customerFormData, customerType: v})}>
                    <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl z-[300]">
                      {CUSTOMER_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs font-bold uppercase">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">GSTIN (Optional)</Label><Input value={customerFormData.gstin} onChange={(e) => setCustomerFormData({...customerFormData, gstin: e.target.value.toUpperCase()})} placeholder="27AAAAA0000A1Z5" className="h-11 rounded-xl font-mono text-xs shadow-inner" /></div>
              </div>
              <div className="space-y-1.5 text-left"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Permanent Address</Label><Textarea value={customerFormData.address} onChange={(e) => setCustomerFormData({...customerFormData, address: e.target.value})} className="min-h-[80px] rounded-xl bg-muted/10 font-medium" placeholder="Enter complete address" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">State Registry</Label>
                  <Select value={customerFormData.state} onValueChange={(v) => setCustomerFormData({...customerFormData, state: v})}>
                    <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-60 rounded-xl border-none shadow-2xl z-[300]">
                      {INDIAN_STATES.map(s => <SelectItem key={s} value={s} className="text-xs font-bold">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Opening Balance ({currencySymbol})</Label><Input type="number" value={customerFormData.openingBalance} onChange={(e) => setCustomerFormData({...customerFormData, openingBalance: parseFloat(e.target.value)})} className="h-11 rounded-xl font-bold" /></div>
              </div>
            </TabsContent>
            <TabsContent value="loyalty" className="m-0 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Reward Points</Label><Input type="number" value={customerFormData.rewardPoints || 0} onChange={(e) => setCustomerFormData({...customerFormData, rewardPoints: parseInt(e.target.value)})} className="h-11 rounded-xl font-bold" /></div>
                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Wallet Balance (₹)</Label><Input type="number" value={customerFormData.walletBalance || 0} onChange={(e) => setCustomerFormData({...customerFormData, walletBalance: parseFloat(e.target.value)})} className="h-11 rounded-xl font-bold" /></div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl text-left"><Switch checked={customerFormData.isVip} onCheckedChange={(v) => setCustomerFormData({...customerFormData, isVip: v})} className="data-[state=checked]:bg-primary" /><span className="text-[10px] font-black uppercase text-primary">Mark as Global VIP</span></div>
            </TabsContent>
            <TabsContent value="messages" className="m-0 space-y-8">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100 text-left"><div className="flex items-center gap-3"><SmartphoneNfc className="h-4 w-4 text-green-600" /><span className="text-[10px] font-black uppercase text-green-700">WhatsApp Marketing Opt-In</span></div><Switch checked={customerFormData.whatsappOptIn} onCheckedChange={(v) => setCustomerFormData({...customerFormData, whatsappOptIn: v})} className="data-[state=checked]:bg-green-600" /></div>
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between px-1"><Label className="text-[10px] font-black uppercase text-primary tracking-widest">Family Occasions</Label></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><Button variant="outline" size="sm" onClick={() => addEvent('birthday')} className="h-9 text-[9px] font-black uppercase rounded-xl w-full"><Plus className="h-3 w-3" /> Birthday</Button><Button variant="outline" size="sm" onClick={() => addEvent('anniversary')} className="h-9 text-[9px] font-black uppercase rounded-xl w-full"><Heart className="h-3 w-3" /> Anniversary</Button><Button variant="outline" size="sm" onClick={() => addEvent('other')} className="h-9 text-[9px] font-black uppercase rounded-xl w-full"><PlusCircle className="h-3 w-3" /> Event</Button></div>
                <div className="space-y-3">
                  {customerFormData.events?.map((ev: any) => (
                    <div key={ev.id} className="p-4 bg-white rounded-2xl border shadow-sm flex flex-col sm:flex-row items-end gap-3"><div className="flex-1 w-full space-y-2 text-left"><Label className="text-[8px] font-black uppercase opacity-40">Label</Label><Input value={ev.label} onChange={(e) => updateEvent(ev.id, 'label', e.target.value)} className="h-9 text-xs font-bold bg-muted/20" /></div><div className="w-full sm:w-40 space-y-2 text-left"><Label className="text-[8px] font-black uppercase opacity-40">Date</Label><Input type="date" value={ev.date} onChange={(e) => updateEvent(ev.id, 'date', e.target.value)} className="h-9 text-xs font-bold bg-muted/20" /></div><Button variant="ghost" size="icon" onClick={() => removeEvent(ev.id)}><X className="h-4 w-4" /></Button></div>
                  ))}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="custom" className="m-0 space-y-6">
              <div className="space-y-4"><div className="flex flex-col sm:flex-row gap-2"><Input placeholder="Field Name" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} className="h-10 rounded-xl text-xs uppercase font-bold flex-1" /><Input placeholder="Value" value={newFieldValue} onChange={(e) => setNewFieldValue(e.target.value)} className="h-10 rounded-xl text-xs flex-1" /><Button onClick={addCustomField} variant="secondary" className="h-10 px-4 rounded-xl shrink-0"><Plus className="h-4 w-4" /></Button></div><div className="grid grid-cols-1 gap-2">{Object.entries(customerFormData.customFields || {}).map(([key, value]) => (<div key={key} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border text-left"><div className="flex flex-col"><span className="text-[8px] font-black uppercase opacity-40">{key}</span><span className="text-xs font-bold">{String(value)}</span></div><button onClick={() => { const updated = { ...customerFormData.customFields }; delete updated[key]; setCustomerFormData((prev: any) => ({ ...prev, customFields: updated })); }} className="text-destructive"><X className="h-4 w-4" /></button></div>))}</div></div>
            </TabsContent>
          </div>
        </Tabs>
        <DialogFooter className="p-8 bg-muted/10 border-t flex flex-row gap-3 text-left">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-12 rounded-xl font-bold uppercase text-[10px]">Cancel</Button>
          <Button onClick={handleSaveCustomer} className="flex-1 h-12 bg-primary font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl text-white">Commit Identity</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
