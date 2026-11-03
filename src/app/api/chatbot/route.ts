import { NextResponse } from 'next/server';
import { websiteChatbot } from '@/ai/flows/website-chatbot-flow';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await websiteChatbot(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Chatbot API error:', error);
    return NextResponse.json(
      { content: "Mafi chahta hoon, mera server abhi busy hai. Kripya thodi der baad koshish karein." },
      { status: 500 }
    );
  }
}
