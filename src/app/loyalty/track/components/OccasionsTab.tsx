
"use client";

import React from "react";
import { Heart, Gift, Star, Edit2, Trash2, SmartphoneNfc, PlusCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface OccasionsTabProps {
  events: any[];
  onAdd: () => void;
  onEdit: (ev: any) => void;
  onDelete: (id: string) => void;
}

export function OccasionsTab({ events, onAdd, onEdit, onDelete }: OccasionsTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in text-left">
      <div className="flex justify-between items-center px-2">
         <h3 className="text-sm font-black uppercase tracking-[0.3em] text-primary">Family Registry</h3>
         <Button onClick={onAdd} className="h-10 px-6 rounded-xl bg-primary font-black uppercase text-[9px] tracking-widest shadow-lg text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Link Occasion
         </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(events || []).map((ev: any) => (
          <Card key={ev.id} className="border-none shadow-md bg-white rounded-2xl p-6 border flex items-center justify-between group hover:shadow-xl transition-all">
            <div className="flex items-center gap-4 text-left">
               <div className="h-12 w-12 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 shadow-inner">
                  {ev.type === 'birthday' ? <Gift className="h-6 w-6" /> : ev.type === 'anniversary' ? <Heart className="h-6 w-6" /> : <Star className="h-6 w-6" />}
               </div>
               <div className="min-w-0 text-left">
                  <p className="text-sm font-black text-slate-900 truncate uppercase">{ev.label}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">{ev.type} • {ev.date}</p>
               </div>
            </div>
            <div className="flex gap-1 opacity-40 sm:opacity-0 group-hover:opacity-100 transition-opacity">
               <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/5" onClick={() => onEdit(ev)}><Edit2 className="h-3.5 w-3.5" /></Button>
               <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-50" onClick={() => onDelete(ev.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </Card>
        ))}
        {(events || []).length === 0 && (
           <div className="col-span-full py-16 text-center border-2 border-dashed rounded-[3rem] opacity-30 italic font-black uppercase text-[10px]">No family nodes registered.</div>
        )}
      </div>
    </div>
  );
}
