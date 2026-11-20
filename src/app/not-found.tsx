import Link from "next/link";
import { ArrowLeft, Home, LayoutDashboard, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
          <Search className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            404 Error
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Page Not Found
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            The page, business storefront, or record you requested does not exist or may have been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
          <Button asChild className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs">
            <Link href="/dashboard">
              <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" /> Open Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs">
            <Link href="/">
              <Home className="mr-1.5 h-3.5 w-3.5" /> Back to Home
            </Link>
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-6 font-mono">
        Biztrix AI &bull; Intelligent Business OS
      </p>
    </div>
  );
}
