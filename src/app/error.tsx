"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, LayoutDashboard, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime errors to console for telemetry
    console.error("Runtime exception captured by Root ErrorBoundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
          <AlertCircle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
            Application Glitch
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Something went wrong
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            An unexpected error occurred while loading this view. You can reload the component or return to the main dashboard.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
          <Button
            type="button"
            onClick={() => reset()}
            className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
          >
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Try Again
          </Button>
          <Button asChild variant="outline" className="h-10 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs">
            <Link href="/dashboard">
              <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" /> Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-6 font-mono">
        Biztrix AI &bull; Resilient Error Boundary
      </p>
    </div>
  );
}
