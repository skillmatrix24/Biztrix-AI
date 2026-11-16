"use client";

import {
  SearchCode,
  Loader2,
  ChevronRight,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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

export function SearchNode({
  memberIdInput,
  setMemberIdInput,
  onSearch,
  state,
  isAdminOrStaff,
}: SearchNodeProps) {
  return (
    <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden text-left shadow-none">
      <CardHeader className="p-6 sm:p-8 text-center space-y-3 bg-slate-900 text-white border-b border-slate-800">
        <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto border border-white/15">
          {state === "searching" ? (
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          ) : (
            <SearchCode className="h-7 w-7 text-white" />
          )}
        </div>
        <div className="space-y-1">
          <CardTitle className="text-xl sm:text-2xl font-bold">
            Find Your Membership
          </CardTitle>
          <CardDescription className="text-slate-300 text-xs">
            Enter your 10-digit mobile number or membership card ID
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-6 sm:p-8 space-y-6">
        <form onSubmit={onSearch} className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="member-search-input"
              className="text-xs font-semibold text-slate-700 block"
            >
              Registered Mobile or Card ID
            </Label>
            <div className="flex gap-2.5">
              <Input
                id="member-search-input"
                value={memberIdInput}
                onChange={(e) => setMemberIdInput(e.target.value.toUpperCase())}
                placeholder="e.g. 98XXXXXXXX or BIZ-1042"
                className="h-12 rounded-xl bg-slate-50 border-slate-200 text-base font-medium font-mono tabular-nums"
              />
              <Button
                type="submit"
                aria-label="Search membership"
                disabled={state === "searching" || !memberIdInput}
                size="icon"
                className="h-12 w-12 rounded-xl bg-primary text-white shrink-0"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {state === "not-found" && (
            <Alert className="bg-red-50 border-red-200 rounded-xl text-red-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs font-medium ml-1">
                No active membership found with this mobile number or card ID.
              </AlertDescription>
            </Alert>
          )}

          {isAdminOrStaff && (
            <div className="p-5 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <p className="text-xs font-bold text-slate-900">
                  Signed-in Staff Access
                </p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Select any customer directly from the Member Registry without
                entering a card ID.
              </p>
              <Button
                asChild
                variant="outline"
                className="w-full h-10 bg-white text-primary border-slate-200 font-semibold text-xs rounded-xl"
              >
                <Link href="/loyalty/members">
                  Open Member Registry <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}

          <Button
            type="submit"
            disabled={state === "searching" || !memberIdInput}
            className="w-full h-12 bg-primary text-white font-semibold text-xs rounded-xl"
          >
            {state === "searching" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Searching...
              </>
            ) : (
              "Find My Membership"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
