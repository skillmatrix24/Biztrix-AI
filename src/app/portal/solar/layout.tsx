"use client";

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default function SolarPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 font-body">
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
        {children}
      </Suspense>
    </div>
  );
}