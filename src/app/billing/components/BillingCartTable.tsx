
"use client";

import { ShoppingCart, Minus, Plus, Trash2, Edit2, AlertTriangle } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateGST } from "@/lib/mock-db";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface BillingCartTableProps {
  items: any[];
  setItems: (items: any[]) => void;
  isInterState: boolean;
  gstMode: 'inclusive' | 'exclusive';
  isQuotation?: boolean;
}

export function BillingCartTable({ items, setItems, isInterState, gstMode, isQuotation }: BillingCartTableProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide bg-white">
      <Table className="min-w-[850px] md:min-w-full">
        <TableHeader><TableRow className="bg-muted/30"><TableHead className="text-[10px] font-black uppercase px-4 md:px-8 h-14 tracking-widest text-left">Item Description</TableHead><TableHead className="w-40 md:w-48 text-center font-black">Qty Control</TableHead><TableHead className="w-20 md:w-24 text-center font-black">Disc %</TableHead><TableHead className="text-right h-14 font-black uppercase">Rate</TableHead><TableHead className="text-right pr-4 md:pr-8 h-14 font-black uppercase">Amount (Inc Tax)</TableHead><TableHead className="w-12 md:w-16"></TableHead></TableRow></TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="h-40 md:h-60 text-center opacity-30 italic text-sm font-black uppercase tracking-widest"><div className="flex flex-col items-center justify-center gap-4"><ShoppingCart className="h-10 w-10 md:h-12 md:w-12 text-primary" /><span>Biztrix cart is empty.</span></div></TableCell></TableRow>
          ) : items.map(item => {
            const discountedPrice = item.price * (1 - item.itemDiscount / 100); 
            const lineAmount = discountedPrice * item.quantity;
            const gstData = calculateGST(lineAmount, item.gstRate, isInterState, gstMode);
            const isOutOfStock = item.quantity > item.stock;

            return (
              <TableRow key={item.id} className="border-b last:border-0 hover:bg-muted/5 transition-colors">
                <TableCell className="px-4 md:px-8 py-4 md:py-6 text-left">
                  <div className="flex flex-col text-left">
                    <span className="font-black text-sm md:text-base text-primary leading-tight uppercase truncate max-w-[200px] md:max-w-none">{item.name}</span>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                       <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase opacity-60">{item.gstRate}% GST • Stock: {item.stock}</span>
                       {isOutOfStock && (
                         <Badge variant="destructive" className="h-4 text-[7px] font-black uppercase px-1.5 flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="h-2.5 w-2.5" /> Stock Low / Quote Only
                         </Badge>
                       )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2 md:gap-3">
                    <Button variant="outline" size="icon" className="h-7 w-7 md:h-8 md:w-8 rounded-lg border-primary/20 text-primary" onClick={() => { const updated = items.map(i => i.id === item.id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i).filter(i => i.quantity > 0); setItems(updated); }}>
                      <Minus className="h-3 w-3 md:h-3.5 md:w-3.5" />
                    </Button>
                    <span className="font-black text-lg md:text-xl min-w-[1.5rem] md:min-w-[2rem]">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7 md:h-8 md:w-8 rounded-lg border-primary/20 text-primary" onClick={() => { 
                      if (!isQuotation && item.quantity + 1 > item.stock) {
                        toast({ variant: "destructive", title: "Insufficient stock available." });
                        return;
                      }
                      const updated = items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i); 
                      setItems(updated); 
                    }}>
                      <Plus className="h-3 w-3 md:h-3.5 md:w-3.5" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Input 
                    type="number" 
                    value={item.itemDiscount} 
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                      setItems(items.map(i => i.id === item.id ? { ...i, itemDiscount: val } : i));
                    }}
                    className="h-8 w-14 md:h-9 md:w-16 mx-auto text-center font-black text-xs bg-muted/20 border-none rounded-xl shadow-inner" 
                  />
                </TableCell>
                <TableCell className="text-right">
                   <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-black uppercase text-primary opacity-60">₹</span>
                        <Input 
                          type="number" 
                          value={item.price} 
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            setItems(items.map(i => i.id === item.id ? { ...i, price: val } : i));
                          }}
                          className="h-8 w-16 md:w-20 text-right font-black text-xs bg-primary/5 border-none rounded-lg shadow-inner focus-visible:ring-primary"
                        />
                      </div>
                      <Input 
                        placeholder="Reason"
                        value={item.rateChangeReason || ""}
                        onChange={(e) => {
                          setItems(items.map(i => i.id === item.id ? { ...i, rateChangeReason: e.target.value } : i));
                        }}
                        className="h-7 w-24 md:w-32 text-[9px] font-bold border-none bg-muted/20 rounded-md placeholder:opacity-40 italic"
                      />
                   </div>
                </TableCell>
                <TableCell className="text-right font-black text-sm md:text-base pr-4 md:pr-8 text-primary">₹{gstData.lineTotal.toLocaleString()}</TableCell>
                <TableCell className="pr-4 md:pr-6"><Button variant="ghost" size="icon" onClick={() => setItems(items.filter(i => i.id !== item.id))} className="h-8 w-8 md:h-9 md:w-9 text-destructive/30 hover:text-destructive rounded-full"><Trash2 className="h-4 w-4 md:h-5 md:w-5" /></Button></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
