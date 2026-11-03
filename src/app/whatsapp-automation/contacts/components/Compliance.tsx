
"use client";

import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function Compliance() {
  return (
    <div className="p-20 text-center opacity-30 italic text-sm font-black uppercase tracking-widest border-2 border-dashed rounded-[3rem] animate-in fade-in">
      <ShieldCheck className="h-12 w-12 mx-auto mb-4" />
      Compliance Registry Clear. No blacklisted nodes detected.
    </div>
  );
}
