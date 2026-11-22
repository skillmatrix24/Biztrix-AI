import { NextResponse } from 'next/server';
import { websiteChatbot } from '@/ai/flows/website-chatbot-flow';

export const dynamic = 'force-dynamic';

// In-memory rate limiter to prevent bot credit drainage (max 10 requests per 2 minutes per IP)
const ipRateMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 2 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRateMap.get(ip);

  // Periodic cleanup of stale IPs
  if (ipRateMap.size > 2000) {
    for (const [key, val] of ipRateMap.entries()) {
      if (val.resetTime < now) ipRateMap.delete(key);
    }
  }

  if (!record || record.resetTime < now) {
    ipRateMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'anonymous_client';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { content: "Aapne kaafi sawal pooch liye hain. Kripya 2 minute baad dubara try karein." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const message = (body?.message || "").trim();

    if (!message) {
      return NextResponse.json(
        { content: "Kripya apna sawal type karein." },
        { status: 400 }
      );
    }

    // Cap message length to 400 characters to prevent huge token consumption
    const trimmedBody = {
      ...body,
      message: message.slice(0, 400),
      history: Array.isArray(body?.history) ? body.history.slice(-4) : []
    };

    const result = await websiteChatbot(trimmedBody);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Chatbot API error:', error);
    return NextResponse.json(
      { content: "Mafi chahta hoon, mera server abhi busy hai. Kripya thodi der baad koshish karein." },
      { status: 500 }
    );
  }
}
