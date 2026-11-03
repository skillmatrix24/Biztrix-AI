
"use client";

import React, { useState } from "react";
import { 
  Handshake, 
  PlusCircle, 
  Trash2, 
  Info, 
  ChevronRight, 
  BookOpen,
  SmartphoneNfc,
  BadgeCheck,
  Star,
  Users,
  Building,
  Target,
  Zap,
  Gem
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const VARIABLE_GUIDE = [
  { id: '{{1}}', label: 'Reference Name', desc: 'Jo partner recommend kar raha hai' },
  { id: '{{2}}', label: 'Beneficiary Name', desc: 'Naya member banne wala customer' },
  { id: '{{3}}', label: 'Membership Tier', desc: 'Gold, VIP, Elite etc.' },
  { id: '{{4}}', label: 'Business Name', desc: 'Aapki shop ka naam' },
  { id: '{{5}}', label: 'Reference Role', desc: 'Partner, Manager, MD etc.' },
];

export function ReferencesHubTab({ 
  references, 
  business, 
  businessRef, 
  metaTemplates, 
  onAddReference, 
  onDeleteReference, 
  onUpdateBusiness 
}: any) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", role: "Partner" });

  const handleAdd = () => {
    onAddReference(formData);
    setFormData({ name: "", phone: "", role: "Partner" });
    setIsAddOpen(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left animate-in fade-in duration-500">
      <div className="lg:col-span-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 px-1">
          <div className="space-y-1 text-left">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-3">
              <Handshake className="h-5 w-5" /> Reference Registry
            </h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Manage external partners for Gift Node logic</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="p-3 bg-muted/20 rounded-2xl border flex flex-col gap-2 w-full sm:min-w-[240px]">
               <Label className="text-[9px] font-black uppercase text-primary tracking-widest">Global Gift Template Node</Label>
               <Select value={business?.defaultReferenceTemplate || ""} onValueChange={(v) => onUpdateBusiness({ defaultReferenceTemplate: v })}>
                  <SelectTrigger className="h-9 rounded-xl bg-white border-none shadow-sm text-[10px] font-bold uppercase w-full">
                    <SelectValue placeholder="Pick Meta Template" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl">
                     {metaTemplates.map((t: any) => <SelectItem key={t.name} value={t.name} className="text-[10px] font-bold uppercase">{t.name}</SelectItem>)}
                     {metaTemplates.length === 0 && <SelectItem value="none" disabled>No templates synced</SelectItem>}
                  </SelectContent>
               </Select>
            </div>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto h-12 px-6 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shrink-0">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Partner
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden text-left w-[95vw]">
                <DialogHeader className="p-8 bg-slate-900 text-white">
                  <DialogTitle className="text-xl font-bold uppercase">New Reference Node</DialogTitle>
                  <DialogDescription className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Register external referral sources</DialogDescription>
                </DialogHeader>
                <div className="p-8 space-y-6">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Full Name</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="h-11 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">WhatsApp Identity</Label>
                    <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} placeholder="91XXXXXXXX" className="h-11 rounded-xl font-bold bg-muted/20 border-none shadow-inner" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Node Role</Label>
                    <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                      <SelectTrigger className="h-11 rounded-xl font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-2xl">
                        <SelectItem value="Partner" className="text-xs font-bold uppercase">Partner</SelectItem>
                        <SelectItem value="Manager" className="text-xs font-bold uppercase">Manager</SelectItem>
                        <SelectItem value="Influencer" className="text-xs font-bold uppercase">Influencer</SelectItem>
                        <SelectItem value="Agent" className="text-xs font-bold uppercase">Agent</SelectItem>
                        <SelectItem value="MD" className="text-xs font-bold uppercase text-primary font-black">MD (Management)</SelectItem>
                        <SelectItem value="Owner" className="text-xs font-bold uppercase text-primary font-black">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="p-8 bg-muted/10 border-t">
                  <Button onClick={handleAdd} disabled={!formData.name || !formData.phone} className="w-full h-14 bg-primary font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl">Deploy Node</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2rem] border">
          <div className="overflow-x-auto scrollbar-hide">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-muted/10">
                  <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Partner Node</TableHead>
                  <TableHead className="text-[10px] font-black uppercase h-12">Role</TableHead>
                  <TableHead className="text-[10px] font-black uppercase h-12 text-center">Status</TableHead>
                  <TableHead className="text-right pr-8 h-12 w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(references || []).length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="h-40 text-center opacity-30 italic text-sm font-black uppercase tracking-widest">No partners registered in hub.</TableCell></TableRow>
                ) : (
                  references.map((r: any) => (
                    <TableRow key={r.id} className="group hover:bg-muted/5 transition-colors border-b">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-4 text-left">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs shadow-inner shrink-0">{r.name?.charAt(0)}</div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-black text-slate-900 truncate uppercase">{r.name}</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase">{r.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-primary/20 text-primary">{r.role}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-100 text-green-700 border-none text-[8px] font-black h-4 px-2 uppercase shadow-sm">ACTIVE</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-all" onClick={() => onDeleteReference(r.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-4 space-y-8">
        <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden lg:sticky lg:top-24 text-left">
          <CardHeader className="p-8 pb-4 border-b border-white/5">
             <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-accent" />
                <CardTitle className="text-sm font-black uppercase tracking-widest">Variable Mapping Guide</CardTitle>
             </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
             <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">
               Meta templates ke liye in variables ka sateek (precise) istemal karein:
             </p>
             <div className="space-y-4">
                {VARIABLE_GUIDE.map((v) => (
                  <div key={v.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-black text-accent font-mono">{v.id}</span>
                        <span className="text-[8px] font-black uppercase text-slate-500 group-hover:text-accent transition-colors">{v.label}</span>
                     </div>
                     <p className="text-[9px] italic text-slate-500 font-medium">"{v.desc}"</p>
                  </div>
                ))}
             </div>
             <Separator className="bg-white/5" />
             <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-3">
                <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium italic">
                  Ye mapping Gift Node onboarding ke waqt automatically variables replace karegi.
                </p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
