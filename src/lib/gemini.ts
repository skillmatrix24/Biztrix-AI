import { GoogleGenAI } from "@google/genai";

export function resolveGeminiApiKey(): string {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GENAI_API_KEY,
  ];
  for (const key of candidates) {
    if (
      key &&
      key !== 'MY_GEMINI_API_KEY' &&
      !key.startsWith('YOUR_') &&
      !key.includes('placeholder') &&
      key.trim().length > 10
    ) {
      return key.trim();
    }
  }
  return '';
}

const resolvedKey = resolveGeminiApiKey();

export function hasValidGeminiKey(): boolean {
  return resolvedKey.length > 0;
}

export const ai = new GoogleGenAI({
  apiKey: resolvedKey || undefined,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});
