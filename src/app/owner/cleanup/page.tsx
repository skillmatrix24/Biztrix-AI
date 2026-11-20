import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import OwnerCleanupClientPage from "./client-page";

export const metadata: Metadata = {
  title: "Database Cleanup & Lifecycle Manager | Biztrix Platform Owner",
  description: "Manage stale trials, subcollection recursive purges, orphan data sweeps, and deletion retention policy.",
};

export default function OwnerCleanupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-24 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900 mb-3" />
          <p className="text-xs font-medium">Loading Database Cleanup Manager...</p>
        </div>
      }
    >
      <OwnerCleanupClientPage />
    </Suspense>
  );
}
