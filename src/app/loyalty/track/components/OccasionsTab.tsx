"use client";

import React from "react";
import { Heart, Gift, Star, Edit2, Trash2, PlusCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyStatePanel } from "@/components/ui/editorial";

interface OccasionsTabProps {
  events: any[];
  onAdd: () => void;
  onEdit: (ev: any) => void;
  onDelete: (id: string) => void;
}

export function OccasionsTab({
  events,
  onAdd,
  onEdit,
  onDelete,
}: OccasionsTabProps) {
  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Family Occasions
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Save birthdays and anniversaries to receive special celebration rewards.
          </p>
        </div>
        <Button
          type="button"
          onClick={onAdd}
          className="h-10 px-5 rounded-xl bg-primary font-semibold text-xs text-white"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add Occasion
        </Button>
      </div>

      {(!events || events.length === 0) ? (
        <EmptyStatePanel
          icon={Gift}
          title="No Occasions Added Yet"
          description="Add a birthday or anniversary so you never miss celebration bonus offers."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={onAdd}
              className="rounded-xl text-xs font-semibold"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add First Occasion
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((ev: any) => (
            <Card
              key={ev.id}
              className="border border-slate-200 bg-white rounded-2xl p-5 flex items-center justify-between gap-3 shadow-none"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 shrink-0">
                  {ev.type === "birthday" ? (
                    <Gift className="h-5 w-5" />
                  ) : ev.type === "anniversary" ? (
                    <Heart className="h-5 w-5" />
                  ) : (
                    <Star className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {ev.label}
                  </p>
                  <p className="text-xs text-slate-500 capitalize font-mono tabular-nums mt-0.5">
                    {ev.type} • {ev.date}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${ev.label}`}
                  className="h-8 w-8 rounded-lg text-slate-600 hover:text-primary hover:bg-slate-100"
                  onClick={() => onEdit(ev)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${ev.label}`}
                  className="h-8 w-8 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => onDelete(ev.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
