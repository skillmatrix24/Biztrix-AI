"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, Minus, Maximize2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Message = {
  role: 'user' | 'ai';
  content: string;
};

export function GlobalChatbot() {
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

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
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
      setMessages(prev => [...prev, { role: 'ai', content: response.content || "Mafi chahta hoon, koi jawab nahi mila." }]);
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
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-white shadow-2xl hover:scale-110 transition-all z-[100] group"
      >
        <MessageCircle className="h-7 w-7 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
      </Button>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-[100] transition-all duration-500 animate-in slide-in-from-bottom-10",
      isMinimized ? "h-14 w-64" : "h-[500px] w-[350px] sm:w-[400px]"
    )}>
      <Card className="h-full border-none shadow-2xl rounded-[2rem] overflow-hidden flex flex-col bg-white border">
        <CardHeader className="bg-slate-900 py-4 px-6 shrink-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Bot className="h-5 w-5 text-accent" />
            </div>
            <div className="text-left">
              <CardTitle className="text-sm font-black text-white uppercase tracking-widest leading-none">Biztrix Bot</CardTitle>
              <p className="text-[8px] font-bold text-accent uppercase tracking-tighter mt-1">Platform Expert v3.5</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white" onClick={() => setIsMinimized(!isMinimized)}>
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
             </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            <CardContent className="flex-1 overflow-hidden p-0 bg-slate-50 flex flex-col">
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {messages.length === 0 && (
                    <div className="text-center py-10 space-y-4">
                      <div className="h-12 w-12 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
                        <Sparkles className="h-6 w-6 text-primary opacity-20" />
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-4">
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
                        "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm border",
                        m.role === 'user' ? "bg-primary text-white" : "bg-white text-primary"
                      )}>
                        {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className={cn(
                        "p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-sm text-left",
                        m.role === 'user' ? "bg-primary text-white rounded-tr-none" : "bg-white border border-border/50 rounded-tl-none text-slate-700 font-medium"
                      )}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="h-8 w-8 rounded-xl bg-white border flex items-center justify-center text-primary shadow-sm"><Bot className="h-4 w-4" /></div>
                      <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-border/50 flex items-center gap-1">
                        <div className="h-1 w-1 bg-primary/40 rounded-full animate-bounce" />
                        <div className="h-1 w-1 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="h-1 w-1 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} className="h-2" />
                </div>
              </ScrollArea>
              
              <div className="px-6 py-2 bg-white border-t overflow-x-auto scrollbar-hide flex gap-2 shrink-0">
                {["Billing setup?", "WhatsApp automation?", "AI Scanner?", "Marketplace fees?"].map((q, i) => (
                  <button 
                    key={i} 
                    onClick={() => { setInput(q); handleSendMessage(); }}
                    className="text-[9px] font-black uppercase tracking-tight text-primary bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10 whitespace-nowrap hover:bg-primary/10 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </CardContent>
            <CardFooter className="p-4 border-t bg-white shrink-0">
              <form onSubmit={handleSendMessage} className="relative w-full flex items-center">
                <Input 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Biztrix ke baare mein puchiye..." 
                  className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner pr-12 text-sm font-bold pl-5 focus-visible:ring-primary"
                />
                <Button 
                  size="icon" 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1.5 h-9 w-9 rounded-xl bg-primary text-white shadow-lg"
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
