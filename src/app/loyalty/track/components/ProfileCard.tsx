
"use client";

import React from "react";
import { SmartphoneNfc, Gem, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ProfileCardProps {
  member: any;
  cardThemeColor: string;
  currencySymbol: string;
}

export function ProfileCard({ member, cardThemeColor, currencySymbol }: ProfileCardProps) {
  const displayExpiry = React.useMemo(() => {
    if (member?.type?.toLowerCase() === 'lifetime') return 'LIFETIME';
    
    const expiryData = member?.expiryDate;
    if (!expiryData) return 'PENDING';

    try {
      // Handle Firestore Timestamp or ISO String
      const d = expiryData.toDate ? expiryData.toDate() : new Date(expiryData);
      
      if (d && !isNaN(d.getTime())) {
        return format(d, 'dd MMM yyyy').toUpperCase();
      }
    } catch (e) {
    console.error(e);
      console.warn("Date parsing error in ProfileCard");
    }
    
    return 'LIFETIME';
  }, [member?.expiryDate, member?.type]);

  return (
    <div className="relative group animate-in fade-in zoom-in-95 duration-1000 mx-2 sm:mx-0">
      <div className="relative w-full min-h-[260px] sm:min-h-[300px] rounded-[2rem] md:rounded-[4rem] overflow-hidden p-6 sm:p-12 flex flex-col justify-between text-white shadow-2xl transition-all duration-700" style={{ backgroundColor: cardThemeColor }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-white/20 blur-[60px]" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-white/10 blur-[80px]" />
          <Gem className="absolute -right-10 -bottom-10 h-48 w-48 text-white/10 -rotate-12 stroke-[1px]" />
        </div>
        
        <div className="relative z-10 flex justify-between items-start text-left">
          <div className="space-y-2 text-left">
            <Badge className="bg-white/20 text-white border-none text-[8px] sm:text-[10px] font-black px-3 sm:px-4 h-5 sm:h-6 uppercase tracking-[0.2em] backdrop-blur-md rounded-full">{member?.tier || 'Standard'} Node</Badge>
            <h2 className="text-2xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none">{member?.customerName}</h2>
          </div>
          <div className="h-10 w-10 sm:h-16 sm:w-16 rounded-xl sm:rounded-[1.5rem] bg-white/10 flex items-center justify-center border border-white/20 shadow-inner backdrop-blur-md shrink-0 text-white"><SmartphoneNfc className="h-5 w-5 sm:h-9 w-9" /></div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-4 sm:gap-16 mt-8 sm:mt-12 text-left">
          <div className="space-y-1 text-left">
              <p className="text-[8px] sm:text-[11px] font-black text-white/50 uppercase tracking-[0.2em]">Rewards Node</p>
              <p className="text-2xl sm:text-4xl md:text-6xl font-black leading-none">{member?.rewardPoints?.toLocaleString() || 0} <span className="text-[10px] sm:text-[12px] opacity-40 font-bold">PTS</span></p>
          </div>
          <div className="space-y-1 text-left">
              <p className="text-[8px] sm:text-[11px] font-black text-white/50 uppercase tracking-[0.2em]">Cashback Node</p>
              <p className="text-2xl sm:text-4xl md:text-6xl font-black leading-none">{currencySymbol}{member?.walletBalance?.toLocaleString() || 0}</p>
          </div>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end border-t border-white/20 pt-6 sm:pt-8 mt-6 sm:mt-8 gap-6 sm:gap-8">
          <div className="space-y-1 w-full sm:w-auto text-left">
              <p className="text-[7px] sm:text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Member Serial Node</p>
              <div className="bg-black/30 backdrop-blur-md px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-white/10 font-mono text-[9px] sm:text-lg font-black tracking-widest text-accent inline-block max-w-full truncate">
                {member?.cardNumber?.toUpperCase() || 'ID-' + member?.id.slice(-6).toUpperCase()}
              </div>
          </div>
          <div className="text-left sm:text-right space-y-1">
              <p className="text-[7px] sm:text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Expiry Window</p>
              <div className="flex items-center gap-2 sm:gap-3 justify-start sm:justify-end text-white">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 opacity-60" />
                <p className="text-xs sm:text-xl font-black uppercase tracking-tighter">{displayExpiry}</p>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
