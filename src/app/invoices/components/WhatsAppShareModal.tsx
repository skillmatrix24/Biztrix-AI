"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, MessageCircle, Send } from "lucide-react";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { sendWhatsAppText } from "@/app/actions/whatsapp-actions";
import {
  buildWhatsAppChatLink,
  buildWhatsAppInvoiceMessage,
  normalizeIndianWhatsAppPhone,
} from "@/lib/invoice-recovery";

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  business: any;
  businessId?: string;
  currencySymbol?: string;
}

export function WhatsAppShareModal({
  isOpen,
  onOpenChange,
  invoice,
  business,
  businessId,
  currencySymbol = "₹",
}: WhatsAppShareModalProps) {
  const firestore = useFirestore();

  const [phoneInput, setPhoneInput] = useState("");
  const [messageText, setMessageText] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSendingApi, setIsSendingApi] = useState(false);

  useEffect(() => {
    if (!isOpen || !invoice) return;
    setPhoneInput(String(invoice.customerPhone || ""));
    setMessageText(
      buildWhatsAppInvoiceMessage({
        invoice,
        business,
        currencySymbol,
      })
    );
    setCopied(false);
  }, [isOpen, invoice, business, currencySymbol]);

  const normalizedPhone = useMemo(
    () => normalizeIndianWhatsAppPhone(phoneInput),
    [phoneInput]
  );
  const waLink = useMemo(
    () => buildWhatsAppChatLink(phoneInput, messageText),
    [phoneInput, messageText]
  );

  const hasApiConfig = Boolean(business?.whatsappApiConfig?.phoneId);

  const handleCopyText = async () => {
    if (!messageText) return;
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      toast({ title: "Bill Summary Copied", description: "Paste directly into WhatsApp or SMS." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: "destructive",
        title: "Clipboard Blocked",
        description: "Select the text manually to copy.",
      });
    }
  };

  const handleSendViaApi = async () => {
    if (!businessId || !hasApiConfig) return;
    if (!normalizedPhone || normalizedPhone.length < 10) {
      toast({
        variant: "destructive",
        title: "Valid Mobile Number Required",
        description: "Enter a 10-digit mobile number to send via WhatsApp Cloud API.",
      });
      return;
    }

    setIsSendingApi(true);
    try {
      await sendWhatsAppText(
        businessId,
        { phoneId: business.whatsappApiConfig.phoneId },
        normalizedPhone,
        messageText
      );

      // Log into unified Chat Hub
      const chatRef = doc(firestore, "businesses", businessId, "chats", normalizedPhone);
      const msgRef = doc(
        collection(firestore, "businesses", businessId, "chats", normalizedPhone, "messages")
      );
      await setDoc(
        chatRef,
        {
          id: normalizedPhone,
          customerName: invoice?.customerName || "Customer",
          lastMessage: `Invoice ${invoice?.invoiceId || ""} shared via WhatsApp`,
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await setDoc(msgRef, {
        id: msgRef.id,
        text: messageText,
        direction: "outbound",
        type: "text",
        status: "sent",
        timestamp: serverTimestamp(),
      });

      toast({
        title: "Sent via Business WhatsApp API",
        description: `Delivered to +${normalizedPhone} and logged in Chat Hub.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "WhatsApp API Send Failed",
        description:
          error?.message ||
          "Use 'Open WhatsApp App' below if the customer hasn't messaged in the last 24h.",
      });
    } finally {
      setIsSendingApi(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 p-0 text-left">
        <DialogHeader className="px-6 py-5 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Share Bill / Payment Reminder
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Invoice{" "}
                <span className="font-mono font-semibold text-slate-700">
                  {invoice?.invoiceId || invoice?.id}
                </span>{" "}
                · {invoice?.customerName || "Customer"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="wa-phone" className="text-xs font-semibold text-slate-700">
              Customer WhatsApp Number
            </Label>
            <Input
              id="wa-phone"
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="e.g., 9876543210"
              className="h-10 font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="wa-message" className="text-xs font-semibold text-slate-700">
                WhatsApp Message Preview
              </Label>
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy Text"}
              </button>
            </div>
            <Textarea
              id="wa-message"
              rows={10}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="text-xs font-mono leading-relaxed resize-y"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex-col sm:flex-row gap-2">
          {hasApiConfig && (
            <Button
              type="button"
              variant="outline"
              disabled={isSendingApi || !messageText.trim()}
              onClick={handleSendViaApi}
              className="h-10 px-4 text-xs font-semibold border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50"
            >
              {isSendingApi ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Send via Cloud API
                </>
              )}
            </Button>
          )}

          <Button
            asChild
            className="h-10 px-5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open in WhatsApp
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
