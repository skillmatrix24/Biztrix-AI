"use client";

import { SearchCode, Loader2, ChevronRight, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

interface SearchNodeProps {
  memberIdInput: string;
  setMemberIdInput: (v: string) => void;
  onSearch: (e?: React.FormEvent) => void;
  state: string;
  isAdminOrStaff: boolean;
}

export function SearchNode({ memberIdInput, setMemberIdInput, onSearch, state, isAdminOrStaff }: SearchNodeProps) {
  return (
    <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border mx-2 text-left">
      <CardHeader className="p-8 sm:p-12 text-center space-y-4 bg-primary text-white">
        <div className="h-16 w-16 md:h-20 md:w-20 rounded-3xl bg-white/10 flex items-center justify-center mx-auto border border-white/20 shadow-inner group">
          {state === "searching" ? <Loader2 className="h-8 w-8 md:h-10 md:w-10 animate-spin text-accent" /> : <SearchCode className="h-8 w-8 md:h-10 md:w-10 text-primary group-hover:scale-110 transition-transform" />}
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl font-black uppercase tracking-tight">Identity Search</CardTitle>
          <CardDescription className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Mobile Number or Card ID</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-8 sm:p-12 space-y-8">
        <form onSubmit={onSearch} className="space-y-6">
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest block">Registered Identity Node</Label>
            <div className="flex gap-3">
              <Input 
                value={memberIdInput} 
                onChange={(e) => setMemberIdInput(e.target.value.toUpperCase())} 
                placeholder="Card ID or Mobile Number" 
                className="h-14 rounded-2xl bg-muted/20 border-none shadow-inner text-base font-bold placeholder:opacity-30" 
              />
              <Button type="submit" disabled={state === "searching" || !memberIdInput} size="icon" className="h-14 w-14 rounded-2xl bg-primary text-white shadow-xl shrink-0">
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>
          </div>
          {state === "not-found" && (
            <Alert className="bg-red-50 border-red-100 rounded-2xl text-red-600">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-[10px] font-black uppercase ml-2">No active member node found in this business registry.</AlertDescription>
            </Alert>
          )}

          {isAdminOrStaff && (
            <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-primary/20 flex flex-col gap-4 animate-in zoom-in-95">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <p className="text-[10px] font-black uppercase text-primary">Logged-in Administrator</p>
                </div>
                <p className="text-[9px] text-muted-foreground font-medium leading-relaxed">Aap bina card ID ke directly Member Registry se kisi ko bhi pick kar sakte hain.</p>
                <Button asChild variant="outline" className="w-full h-12 bg-white text-primary border-primary/20 font-black uppercase text-[9px] rounded-xl shadow-sm">
                    <Link href="/loyalty/members">Go to Member Registry <ArrowRight className="ml-2 h-3.5 w-3.5" /></Link>
                </Button>
            </div>
          )}

          <Button onClick={onSearch} disabled={state === "searching" || !memberIdInput} className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl">Run Registry Check</Button>
        </form>
      </CardContent>
    </Card>
  );
}
