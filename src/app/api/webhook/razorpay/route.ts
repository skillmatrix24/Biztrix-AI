
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { initializeAdmin } from '@/firebase/admin';

/**
 * Razorpay Webhook Handler
 * Hardened: Secure signature verification and privileged settlement call.
 * RELIABILITY: Returns 5xx on settlement failure to trigger Razorpay retries.
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('bId');

  if (!businessId) {
    return NextResponse.json({ status: 'error', message: 'Missing Business context' }, { status: 400 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  const { db } = initializeAdmin();

  try {
    // 1. Resolve Webhook Secret from Gateway Config
    const gatewayQuery = db.collection(`businesses/${businessId}/paymentGatewayConfigs`)
      .where('provider', '==', 'RAZORPAY')
      .where('isActive', '==', true)
      .limit(1);
    
    const gatewaySnap = await gatewayQuery.get();
    if (gatewaySnap.empty) throw new Error("Gateway not found");
    
    const gatewayData = gatewaySnap.docs[0].data();
    const webhookSecret = gatewayData.webhookSecret;

    if (!webhookSecret) throw new Error("Webhook secret not established");

    // 2. Signature Verification
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn(`[Webhook] Invalid signature for business ${businessId}`);
      return NextResponse.json({ status: 'error', message: 'Signature Mismatch' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    
    // 3. Handle Success Events
    if (event === 'payment.captured' || event === 'order.paid') {
      const rzpPaymentId = payload.payload.payment.entity.id;
      const rzpOrderId = payload.payload.payment.entity.order_id;
      const notes = payload.payload.payment.entity.notes || {};
      const bizOrderId = notes.orderId;

      if (!bizOrderId) {
         return NextResponse.json({ status: 'ok', info: 'No mapping found' });
      }

      // 4. Trigger Settlement via Verification Node
      // SECURITY: Uses internal token to bypass public signature check
      const verifyUrl = `${new URL(request.url).origin}/api/payments/verify`;
      
      const settlementResponse = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-biztrix-internal-token': process.env.BIZTRIX_INTERNAL_TOKEN || ""
        },
        body: JSON.stringify({
          razorpay_payment_id: rzpPaymentId,
          razorpay_order_id: rzpOrderId,
          businessId,
          orderId: bizOrderId
        })
      });

      const settlementResult = await settlementResponse.json();
      
      if (!settlementResponse.ok) {
        console.error(`[Webhook] Settlement Critical Failure:`, settlementResult);
        // THROW to return 500. This prompts Razorpay to retry.
        throw new Error(settlementResult.message || "Settlement failed");
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error("[Webhook Error]", error.message);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
