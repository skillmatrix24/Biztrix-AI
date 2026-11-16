"use client";

import { useState } from "react";
import {
  Bot,
  Mail,
  ArrowRight,
  Loader2,
  ChevronLeft,
  CheckCircle2,
  Home,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useAuth, initiatePasswordReset } from "@/firebase";
import { toast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await initiatePasswordReset(auth, email);
      setSent(true);
      toast({
        title: "Email Sent",
        description: "Check your inbox for the reset link.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to send reset link.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
        </div>

        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-105">
              <Bot className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              Biztrix AI
            </span>
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 mt-4 tracking-tight">
            Reset Your Password
          </h1>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            Enter your registered email address to receive a password recovery link.
          </p>
        </div>

        <Card className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-none">
          <CardContent className="p-6 sm:p-8">
            {!sent ? (
              <form onSubmit={handleReset} className="space-y-5 text-left">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                    Registered Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      required
                      className="h-11 pl-10 rounded-xl bg-white border-slate-200 text-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm transition-colors"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      Send Recovery Link <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center py-4 space-y-5 animate-in zoom-in-95 duration-300">
                <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="h-6 w-6 text-emerald-700" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold text-slate-900">Recovery Link Sent</h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    We sent a password reset link to{" "}
                    <span className="font-mono font-semibold text-slate-900">{email}</span>.
                    Please check your inbox and spam folder.
                  </p>
                </div>
                <Button
                  asChild
                  className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
                >
                  <Link href="/login">Return to Sign In</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Encrypted Account Recovery
          </p>
        </div>
      </div>
    </div>
  );
}
