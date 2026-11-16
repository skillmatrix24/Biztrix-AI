"use client";

import React from "react";
import {
  Loader2,
  MessageSquare,
  ExternalLink,
  Trash2,
  MoreVertical,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyStatePanel } from "@/components/ui/editorial";
import { cn } from "@/lib/utils";

interface TemplateRegistryProps {
  isLoading: boolean;
  templates: any[];
  onDelete: (name: string) => void;
}

export function TemplateRegistry({
  isLoading,
  templates,
  onDelete,
}: TemplateRegistryProps) {
  if (!isLoading && templates.length === 0) {
    return (
      <EmptyStatePanel
        icon={MessageSquare}
        title="No WhatsApp templates found"
        description="Sync your Meta Cloud registry or create a new template in Visual Designer."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="border-slate-100 bg-slate-50/70">
              <TableHead className="h-11 pl-6 text-xs font-semibold text-slate-600">
                Template Name
              </TableHead>
              <TableHead className="h-11 text-xs font-semibold text-slate-600">
                Meta Category
              </TableHead>
              <TableHead className="h-11 text-center text-xs font-semibold text-slate-600">
                Status
              </TableHead>
              <TableHead className="h-11 w-24 pr-6 text-right text-xs font-semibold text-slate-600">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-48 text-center">
                  <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-slate-400" />
                  <p className="text-xs font-medium text-slate-500">
                    Syncing Meta Cloud templates...
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              templates.map((t: any) => (
                <TableRow
                  key={t.id || t.name}
                  className="border-slate-100 transition-colors hover:bg-slate-50/60"
                >
                  <TableCell className="py-4 pl-6">
                    <div className="flex items-center gap-3 text-left">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold text-slate-900">
                          {t.name}
                        </p>
                        <p className="font-mono text-xs text-slate-500">
                          {t.language}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="rounded-md border-slate-200 text-xs font-medium text-slate-700"
                    >
                      {t.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={cn(
                        "rounded-md border-none text-xs font-medium",
                        t.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700"
                          : t.status === "PENDING"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      )}
                    >
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for template ${t.name}`}
                          className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl p-1.5">
                        <DropdownMenuItem asChild className="cursor-pointer rounded-lg p-2 text-xs font-medium">
                          <a
                            href="https://business.facebook.com/wa/manage/templates"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-3.5 w-3.5" /> Open in Meta Business
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer rounded-lg p-2 text-xs font-medium text-red-600 focus:text-red-600"
                          onClick={() => onDelete(t.name)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Template
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
