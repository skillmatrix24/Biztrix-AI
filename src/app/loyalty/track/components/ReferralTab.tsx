"use client";

import React from "react";
import {
  Trophy,
  SmartphoneNfc,
  Check,
  Copy,
  Flame,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ReferralTabProps {
  member: any;
  business: any;
  currencySymbol: string;
  referralLink: string;
  isReferralCopied: boolean;
  topReferrers: any[];
  onShare?: () => void;
  onCopy: () => void;
}

export function ReferralTab({
  member,
  business,
  currencySymbol,
  referralLink,
  isReferralCopied,
  topReferrers,
  onCopy,
}: ReferralTabProps) {
  const shareMessage = `Namaste! Join the ${business?.name || "Store"} Loyalty Program and unlock exclusive rewards instantly! Use my link to join: ${referralLink}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  return (
    <div className="text-left">
      <Card className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-none">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-6 sm:p-10 bg-slate-50/70 flex flex-col justify-center space-y-6 border-b md:border-b-0 md:border-r border-slate-200 text-left">
            <div className="space-y-3">
              <Badge className="bg-primary text-white border-none text-xs font-semibold px-3 h-6 rounded-full">
                Referral Program Active
              </Badge>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                Refer Friends, Earn Rewards
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed max-w-md">
                When your friend joins with your link, they get a welcome bonus
                and you receive instant cashback credits.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 text-center space-y-1">
                <p className="text-xs font-medium text-primary">You Earn</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  {currencySymbol}
                  {business?.referralBonusAmount || 50}
                </p>
                <p className="text-xs text-slate-500">Per successful referral</p>
              </div>
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 text-center space-y-1">
                <p className="text-xs font-medium text-emerald-700">
                  Friend Gets
                </p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  {currencySymbol}
                  {business?.welcomeBonusAmount || 100}
                </p>
                <p className="text-xs text-slate-600">Welcome bonus</p>
              </div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Your Referrals
                </p>
                <div className="flex items-center gap-2.5 mt-1">
                  <p className="text-2xl font-bold text-primary font-mono tabular-nums">
                    {member?.referralCount || 0}
                  </p>
                  <Badge
                    variant="outline"
                    className="bg-slate-50 text-slate-700 border-slate-200 text-xs font-medium"
                  >
                    Successful Joins
                  </Badge>
                </div>
              </div>
              <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-primary shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl gap-2"
              >
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SmartphoneNfc className="h-4 w-4" /> Share via WhatsApp
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCopy}
                className="flex-1 h-12 rounded-xl font-semibold text-xs border-slate-300 text-slate-800 bg-white hover:bg-slate-50"
              >
                {isReferralCopied ? (
                  <Check className="h-4 w-4 mr-2 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {isReferralCopied ? "Link Copied" : "Copy Referral Link"}
              </Button>
            </div>
          </div>

          <div className="p-6 sm:p-10 bg-slate-900 text-white flex flex-col justify-between gap-6 text-left">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-400">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    Referral Leaderboard
                  </h4>
                  <p className="text-xs text-slate-400">Top 10 members</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {!topReferrers || topReferrers.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">
                    No referrals recorded yet. Be the first on the leaderboard!
                  </p>
                ) : (
                  topReferrers.map((ref, idx) => {
                    const isMe = ref.id === member?.id;
                    return (
                      <div
                        key={ref.id}
                        className={cn(
                          "px-4 py-3 rounded-xl border flex items-center justify-between transition-colors",
                          isMe
                            ? "bg-white/15 border-amber-400/60"
                            : "bg-white/5 border-white/10"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={cn(
                              "text-xs font-bold font-mono tabular-nums w-6 text-center",
                              idx === 0
                                ? "text-amber-400"
                                : idx === 1
                                  ? "text-slate-300"
                                  : idx === 2
                                    ? "text-orange-400"
                                    : "text-slate-500"
                            )}
                          >
                            #{idx + 1}
                          </span>
                          <div className="min-w-0 flex items-center gap-2">
                            <p className="text-sm font-semibold truncate max-w-[140px]">
                              {ref.customerName?.substring(0, 1)}***
                              {ref.customerName?.slice(-1)}
                            </p>
                            {isMe && (
                              <Badge className="bg-amber-400 text-slate-900 border-none text-[11px] font-bold h-5 px-2">
                                You
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-slate-300 whitespace-nowrap font-mono tabular-nums">
                          {ref.referralCount || 0} referrals
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-start gap-3">
              <Flame className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 leading-relaxed">
                Top 10 referrers unlock a{" "}
                <span className="text-white font-semibold">
                  complimentary tier upgrade
                </span>{" "}
                on annual renewal.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
