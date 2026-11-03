"use client";

import { Receipt, SmartphoneNfc, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface StatusHeaderProps {
  isRewardSyncMode: boolean;
  setIsRewardSyncMode: (v: boolean) => void;
  isQuotation: boolean;
  setIsQuotation: (v: boolean) => void;
  setItems: (items: any[]) => void;
}

export function StatusHeader({ isRewardSyncMode, setIsRewardSyncMode, isQuotation, setIsQuotation, setItems }: StatusHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-[1.5rem] bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
          <Receipt className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl md:text-4xl font-black text-slate-900 uppercase">Billing Hub</h2>
      </div>
      <div className="flex flex-wrap items-center gap-3">
         <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl border shadow-sm w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <SmartphoneNfc className="h-4 w-4 text-green-600" />
              <span className="text-[10px] font-black uppercase text-muted-foreground">Reward Sync Only</span>
            </div>
            <Switch 
              checked={isRewardSyncMode} 
              onCheckedChange={(v) => { 
                setIsRewardSyncMode(v); 
                if(v) { setItems([]); setIsQuotation(false); } 
              }} 
              className="data-[state=checked]:bg-green-600 scale-90" 
            />
         </div>

         <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl border shadow-sm w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-orange-600" />
              <span className="text-[10px] font-black uppercase text-muted-foreground">Quotation</span>
            </div>
            <Switch 
              checked={isQuotation} 
              onCheckedChange={(v) => { 
                setIsQuotation(v); 
                if(v) setIsRewardSyncMode(false); 
              }} 
              className="data-[state=checked]:bg-orange-600 scale-90" 
            />
         </div>
      </div>
    </div>
  );
}
