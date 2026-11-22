"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, Minus, Maximize2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useUser } from "@/firebase";
import { shouldShowGlobalChatbot, hasMobileBottomShell } from "@/lib/responsive-shell";

type Action = {
  label: string;
  route: string;
  type?: string;
};

type Message = {
  role: 'user' | 'ai';
  content: string;
  actions?: Action[];
};

export function GlobalChatbot() {
  const pathname = usePathname();
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  if (!shouldShowGlobalChatbot(pathname)) {
    return null;
  }

  const isAuthenticatedUser = Boolean(user && !user.isAnonymous);
  const offsetAboveMobileShell = hasMobileBottomShell(pathname, isAuthenticatedUser);

  const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const raw = typeof overrideText === "string" ? overrideText : input;
    if (!raw.trim() || isLoading) return;

    const userMessage = raw.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-6),
        }),
      });
      const response = await res.json();
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: response.content || "Mafi chahta hoon, koi jawab nahi mila.",
        actions: response.actions || []
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', content: "Mafi chahta hoon, mera server abhi busy hai. Kripya thodi der baad koshish karein." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button 
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Biztrix Assistant"
        className={cn(
          "fixed rounded-full bg-slate-900 md:bg-primary text-white border border-white/20 shadow-md hover:scale-105 transition-transform z-[55] md:z-[90] group",
          offsetAboveMobileShell
            ? "bottom-[calc(8.5rem+env(safe-area-inset-bottom))] right-3.5 h-11 w-11 md:bottom-6 md:right-6 md:h-14 md:w-14"
            : "bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 h-12 w-12 md:bottom-6 md:right-6 md:h-14 md:w-14"
        )}
      >
        <MessageCircle className="h-5 w-5 md:h-6 md:w-6 group-hover:rotate-6 transition-transform" />
      </Button>
    );
  }

  return (
    <div className={cn(
      "fixed z-[95] transition-all duration-300 animate-in slide-in-from-bottom-6",
      isMinimized
        ? cn(
            "right-3 md:right-6 h-14 w-[min(16rem,calc(100vw-1.5rem))]",
            offsetAboveMobileShell
              ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6"
              : "bottom-[calc(1rem+env(safe-area-inset-bottom))] md:bottom-6"
          )
        : cn(
            "inset-x-3 md:inset-x-auto md:right-6 w-auto md:w-[380px] lg:w-[400px]",
            offsetAboveMobileShell
              ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] h-[min(480px,calc(100dvh-6rem))] md:bottom-6 md:h-[min(520px,calc(100dvh-3rem))]"
              : "bottom-[calc(1rem+env(safe-area-inset-bottom))] h-[min(500px,calc(100dvh-2.5rem))] md:bottom-6 md:h-[min(520px,calc(100dvh-3rem))]"
          )
    )}>
      <Card className="h-full border border-slate-200 shadow-xl rounded-2xl overflow-hidden flex flex-col bg-white">
        <CardHeader className="bg-slate-900 py-3.5 px-4 sm:px-5 shrink-0 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
              <Bot className="h-4 w-4 text-accent" />
            </div>
            <div className="text-left min-w-0">
              <CardTitle className="text-sm font-bold text-white leading-none truncate">Biztrix Bot</CardTitle>
              <p className="text-[11px] font-medium text-slate-300 mt-1 truncate">Platform Expert</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
             <Button
               type="button"
               variant="ghost"
               size="icon"
               aria-label={isMinimized ? "Expand assistant" : "Minimize assistant"}
               className="h-9 w-9 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
               onClick={() => setIsMinimized(!isMinimized)}
             >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
             </Button>
             <Button
               type="button"
               variant="ghost"
               size="icon"
               aria-label="Close assistant"
               className="h-9 w-9 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
               onClick={() => setIsOpen(false)}
             >
                <X className="h-4 w-4" />
             </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            <CardContent className="flex-1 overflow-hidden p-0 bg-slate-50 flex flex-col">
              <ScrollArea className="flex-1 p-5">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8 space-y-3">
                      <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-xs font-medium text-slate-600 px-4 leading-relaxed">
                        Namaste! Main Biztrix Assistant hoon. Mujhse platform ke kisi bhi feature ke baare mein puchiye.
                      </p>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={cn(
                      "flex gap-3 max-w-[85%] animate-in slide-in-from-bottom-2",
                      m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                    )}>
                      <div className={cn(
                        "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border",
                        m.role === 'user' ? "bg-primary text-white border-primary" : "bg-white text-primary border-slate-200"
                      )}>
                        {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className="space-y-2 max-w-full">
                        <div className={cn(
                          "p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-left",
                          m.role === 'user' ? "bg-primary text-white rounded-tr-none" : "bg-white border border-slate-200 rounded-tl-none text-slate-700 font-medium"
                        )}>
                          {m.content}
                        </div>
                        {m.actions && m.actions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {m.actions.map((act, actIdx) => (
                              <Link
                                key={actIdx}
                                href={act.route}
                                onClick={() => setIsOpen(false)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs"
                              >
                                <span>{act.label}</span>
                                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary"><Bot className="h-4 w-4" /></div>
                      <div className="bg-white p-3.5 rounded-2xl rounded-tl-none border border-slate-200 flex items-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-xs text-slate-500">Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} className="h-2" />
                </div>
              </ScrollArea>
              
              <div className="px-4 py-2 bg-white border-t border-slate-200 overflow-x-auto scrollbar-hide flex gap-2 shrink-0">
                {[
                  "Billing POS setup?", 
                  "Thermal printer connect?", 
                  "Staff attendance & payroll?", 
                  "Customer udhaar ledger?", 
                  "Digital loyalty pass?", 
                  "Solar EPC proposals?"
                ].map((q, i) => (
                  <button 
                    key={i} 
                    type="button"
                    onClick={() => handleSendMessage(undefined, q)}
                    className="text-xs font-medium text-primary bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/15 whitespace-nowrap hover:bg-primary/10 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </CardContent>
            <CardFooter className="p-3.5 border-t border-slate-200 bg-white shrink-0">
              <form onSubmit={(e) => handleSendMessage(e)} className="relative w-full flex items-center">
                <Input 
                  value={input || ""} 
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Biztrix ke baare mein puchiye..." 
                  className="h-11 rounded-xl bg-slate-50 border border-slate-200 pr-12 text-sm font-medium pl-4 focus-visible:ring-primary"
                />
                <Button 
                  size="icon" 
                  type="submit"
                  aria-label="Send message"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1.5 h-8 w-8 rounded-lg bg-primary text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
