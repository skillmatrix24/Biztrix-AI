
"use client";

import { useState } from "react";
import { 
  Bot, 
  Mail, 
  ArrowRight, 
  Loader2, 
  ChevronLeft,
  CheckCircle2,
  Home
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
      toast({ title: "Email Sent", description: "Check your inbox for the reset link." });
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to send reset link." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-body">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/login" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
              <ChevronLeft className="h-4 w-4" /> Back to Login
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
              <Home className="h-3.5 w-3.5" /> Back to Home
            </Link>
          </div>
          <div className="flex justify-center">
            <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
              <Bot className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Identity Recovery</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">Enter your email to receive a secure recovery link.</p>
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
          <CardContent className="p-6 sm:p-8 pt-10">
            {!sent ? (
              <form onSubmit={handleReset} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Registered Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@company.com" 
                      required 
                      className="h-12 pl-11 rounded-xl bg-muted/20 border-none shadow-inner text-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <span className="flex items-center gap-2">Send Recovery Link <ArrowRight className="h-4 w-4" /></span>
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center py-6 space-y-6 animate-in zoom-in-95 duration-300">
                <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center mx-auto border border-green-100">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-primary">Email Dispatched</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A secure link has been sent to <strong>{email}</strong>. Please check your inbox and spam folder.
                  </p>
                </div>
                <Button asChild className="w-full h-12 rounded-xl bg-muted text-primary font-bold uppercase text-[10px] tracking-widest hover:bg-muted/80 shadow-inner">
                  <Link href="/login">Return to Login</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
