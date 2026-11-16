"use client";

import { ShieldCheck } from "lucide-react";
import { EmptyStatePanel } from "@/components/ui/editorial";

export function Compliance() {
  return (
    <EmptyStatePanel
      icon={ShieldCheck}
      title="Compliance Registry Clear"
      description="No opted-out or blocked contacts detected across your active WhatsApp messaging lists."
    />
  );
}
