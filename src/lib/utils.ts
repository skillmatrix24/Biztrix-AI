import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the appropriate currency symbol based on the currency code.
 */
export function getCurrencySymbol(currency: string = "INR") {
  const symbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "AED ",
    SAR: "SR ",
    JPY: "¥",
  };
  return symbols[currency] || "₹";
}

/**
 * Normalizes a phone number to standard 10-digit format for safe deterministic matching.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}
