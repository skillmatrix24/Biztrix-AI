"use client";

import React, { useState } from "react";
import { Handshake, PlusCircle, Trash2, Info, BookOpen } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { SectionCard, EmptyStatePanel } from "@/components/ui/editorial";

const VARIABLE_GUIDE = [
  { id: "{{1}}", label: "Reference Name", desc: "Jo partner recommend kar raha hai" },
  { id: "{{2}}", label: "Beneficiary Name", desc: "Naya member banne wala customer" },
  { id: "{{3}}", label: "Membership Tier", desc: "Gold, VIP, Elite etc." },
  { id: "{{4}}", label: "Business Name", desc: "Aapki shop ka naam" },
  { id: "{{5}}", label: "Reference Role", desc: "Partner, Manager, MD etc." },
];

export function ReferencesHubTab({
  references,
  business,
  metaTemplates,
  onAddReference,
  onDeleteReference,
  onUpdateBusiness,
}: any) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", role: "Partner" });

  const handleAdd = () => {
    onAddReference(formData);
    setFormData({ name: "", phone: "", role: "Partner" });
    setIsAddOpen(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left items-start">
      <div className="lg:col-span-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Handshake className="h-4 w-4 text-slate-700" /> Partner Referral Directory
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Manage external partners for VIP gift membership onboarding.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={business?.defaultReferenceTemplate || ""}
              onValueChange={(v) => onUpdateBusiness({ defaultReferenceTemplate: v })}
            >
              <SelectTrigger className="h-10 w-52 rounded-xl bg-white border-slate-200 text-xs font-medium">
                <SelectValue placeholder="Gift Template..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {metaTemplates.map((t: any) => (
                  <SelectItem key={t.name} value={t.name} className="text-xs font-mono">
                    {t.name}
                  </SelectItem>
                ))}
                {metaTemplates.length === 0 && (
                  <SelectItem value="none" disabled>
                    No templates synced
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Partner
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px] rounded-2xl border border-slate-200 p-0 overflow-hidden text-left w-[95vw]">
                <DialogHeader className="p-6 bg-slate-900 text-white border-b border-slate-800">
                  <DialogTitle className="text-base font-bold text-white">Add Referral Partner</DialogTitle>
                  <DialogDescription className="text-slate-300 text-xs mt-0.5">
                    Register a partner or influencer for VIP gift memberships.
                  </DialogDescription>
                </DialogHeader>
                <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Full Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">WhatsApp Number</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                      placeholder="91XXXXXXXXXX"
                      className="h-10 rounded-xl font-mono tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Role</Label>
                    <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                      <SelectTrigger className="h-10 rounded-xl text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Partner" className="text-xs">Partner</SelectItem>
                        <SelectItem value="Manager" className="text-xs">Manager</SelectItem>
                        <SelectItem value="Influencer" className="text-xs">Influencer</SelectItem>
                        <SelectItem value="Agent" className="text-xs">Agent</SelectItem>
                        <SelectItem value="MD" className="text-xs font-semibold">MD (Management)</SelectItem>
                        <SelectItem value="Owner" className="text-xs font-semibold">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100">
                  <Button
                    onClick={handleAdd}
                    disabled={!formData.name || !formData.phone}
                    className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
                  >
                    Save Partner
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <SectionCard bodyClassName="p-0">
          {(references || []).length === 0 ? (
            <div className="p-6">
              <EmptyStatePanel
                icon={Handshake}
                title="No referral partners registered"
                description="Add partners, managers, or influencers to track VIP gift cards issued under their reference."
              />
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200">
                    <TableHead className="pl-6 text-xs font-semibold text-slate-600 h-11">Partner</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 h-11">Role</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 h-11 text-center">Status</TableHead>
                    <TableHead className="text-right pr-6 text-xs font-semibold text-slate-600 h-11 w-20">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {references.map((r: any) => (
                    <TableRow key={r.id} className="hover:bg-slate-50/60 border-b border-slate-100">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                            {r.name?.charAt(0) || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{r.name}</p>
                            <p className="text-xs font-mono tabular-nums text-slate-500">{r.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] font-medium border-slate-200 text-slate-700">
                          {r.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove partner ${r.name}`}
                          className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50"
                          onClick={() => onDeleteReference(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="lg:col-span-4 lg:sticky lg:top-24">
        <div className="rounded-2xl bg-slate-900 text-white overflow-hidden border border-slate-800 text-left">
          <div className="p-5 border-b border-white/10 flex items-center gap-2.5">
            <BookOpen className="h-4 w-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">Variable Mapping Guide</h4>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Meta templates ke liye in variables ka sateek istemal karein:
            </p>
            <div className="space-y-2.5">
              {VARIABLE_GUIDE.map((v) => (
                <div key={v.id} className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-bold text-emerald-300 font-mono">{v.id}</span>
                    <span className="text-[11px] font-semibold text-slate-200">{v.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">"{v.desc}"</p>
                </div>
              ))}
            </div>
            <Separator className="bg-white/10" />
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 leading-relaxed">
                Ye mapping Gift Card onboarding ke waqt automatically variables replace karegi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
