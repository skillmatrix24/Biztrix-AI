
"use client";

import React from "react";
import { 
  Loader2, 
  MessageSquare, 
  ExternalLink, 
  Trash2, 
  MoreVertical 
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TemplateRegistryProps {
  isLoading: boolean;
  templates: any[];
  onDelete: (name: string) => void;
}

export function TemplateRegistry({ isLoading, templates, onDelete }: TemplateRegistryProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <Table className="min-w-[1000px]">
        <TableHeader>
          <TableRow className="bg-muted/10">
            <TableHead className="pl-8 text-[10px] font-black uppercase h-12">Template Name</TableHead>
            <TableHead className="text-[10px] font-black uppercase h-12">Meta Category</TableHead>
            <TableHead className="text-[10px] font-black uppercase h-12 text-center">Status</TableHead>
            <TableHead className="text-right pr-8 h-12 w-32"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="h-60 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center">Polling Meta Cloud...</p>
              </TableCell>
            </TableRow>
          ) : templates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-60 text-center opacity-30 italic text-sm font-black uppercase tracking-widest">No deployed nodes found.</TableCell>
            </TableRow>
          ) : (
            templates.map((t: any) => (
              <TableRow key={t.id || t.name} className="group hover:bg-muted/5 transition-colors border-b">
                <TableCell className="pl-8 py-5">
                  <div className="flex items-center gap-4 text-left">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{t.name}</p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">{t.language}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[7px] font-black uppercase h-4 px-1.5 border-primary/20 text-primary">{t.category}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={cn(
                    "text-[8px] font-black uppercase h-4 px-2 border-none shadow-sm",
                    t.status === 'APPROVED' ? "bg-green-100 text-green-700" :
                    t.status === 'PENDING' ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"
                  )}>{t.status}</Badge>
                </TableCell>
                <TableCell className="text-right pr-8">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-none shadow-2xl p-1.5">
                      <DropdownMenuItem className="text-[10px] font-bold uppercase p-2.5 rounded-lg cursor-pointer" onClick={() => window.open(`https://business.facebook.com/wa/manage/templates`, '_blank')}>
                        <ExternalLink className="mr-2 h-3.5 w-3.5" /> Open in Meta Business
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-[10px] font-bold uppercase p-2.5 rounded-lg cursor-pointer text-destructive focus:text-destructive" onClick={() => onDelete(t.name)}>
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Erase Node
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
  );
}
