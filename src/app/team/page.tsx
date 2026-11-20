import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import TeamClientPage from "./client-page";

export const metadata = {
  title: "Team Directory | Biztrix AI",
  description: "Manage workspace team members, logins, roles, and WhatsApp invitations.",
};

export default function TeamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-slate-400 mb-2" />
          <p className="text-xs text-slate-500 font-medium">Loading Team Directory...</p>
        </div>
      }
    >
      <TeamClientPage />
    </Suspense>
  );
}
