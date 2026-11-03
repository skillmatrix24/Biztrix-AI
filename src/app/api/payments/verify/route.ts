import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { initializeAdmin } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendWhatsAppTemplate } from "@/app/actions/whatsapp-actions";

/**
 * Helper to ensure phone number has international country code (91 for India)
 */
function formatPhoneForMeta(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) clean = clean.substring(1);
  if (clean.length === 10) return `91${clean}`;
  return clean;
}

/**
 * Secure Server Route: Payment Verification & Settlement
 * Verifies Razorpay signature and performs atomic onboarding or order settlement.
 * HARDENED: Uses Admin SDK to bypass public write blocks.
 * SECURITY: NO predictably guessable bypass tokens.
 */
export async function POST(request: Request) {
  const { db, admin } = initializeAdmin();
  
  try {
    const body = await request.json();
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      businessId,
      orderId 
    } = body;

    // Resolve Authorization Type
    const internalToken = request.headers.get('x-biztrix-internal-token');
    const isInternalCall = internalToken && internalToken === process.env.BIZTRIX_INTERNAL_TOKEN;

    if (!businessId || !razorpay_order_id || !razorpay_payment_id || (!razorpay_signature && !isInternalCall)) {
       return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    // RESOLVE RELIABLE ORIGIN FOR TRACKING LINKS
    const host = request.headers.get('host') || '';
    let origin = 'https://biztrix.in'; 
    if (host && !host.includes('localhost') && !host.includes('run.app')) {
      origin = `https://${host}`;
    }

    // 1. Resolve Biztrix Order Node
    const bizOrderId = orderId || razorpay_order_id;
    const orderRef = db.doc(`businesses/${businessId}/orders/${bizOrderId}`);
    const orderSnap = await orderRef.get();
    
    if (!orderSnap.exists) {
      return NextResponse.json({ success: false, message: "Order node not found" }, { status: 404 });
    }
    const orderData = orderSnap.data();

    // 2. Security Check: Tenant & Node Integrity
    if (orderData?.businessId !== businessId) {
       return NextResponse.json({ success: false, message: "Tenant mismatch" }, { status: 403 });
    }
    if (orderData?.razorpayOrderId && orderData.razorpayOrderId !== razorpay_order_id) {
       return NextResponse.json({ success: false, message: "Invalid payment mapping" }, { status: 400 });
    }

    // 3. Idempotency Check (Pre-transactional hint)
    if (orderData?.status === 'paid') {
       return NextResponse.json({ success: true, message: "Already processed" });
    }

    // 4. SIGNATURE VALIDATION (Skip only for verified internal webhook triggers)
    if (!isInternalCall) {
        const gatewayQuery = db.collection(`businesses/${businessId}/paymentGatewayConfigs`)
            .where('provider', '==', 'RAZORPAY')
            .where('isActive', '==', true)
            .limit(1);
        
        const gatewaySnap = await gatewayQuery.get();
        if (gatewaySnap.empty) return NextResponse.json({ success: false, message: "Gateway not configured" }, { status: 404 });
        
        const gatewayDocId = gatewaySnap.docs[0].id;
        const privateRef = db.doc(`businesses/${businessId}/privateConfig/gateways`);
        const privateSnap = await privateRef.get();
        const privateData = privateSnap.exists() ? privateSnap.data() : {};

        const secret = process.env.RAZORPAY_KEY_SECRET || privateData?.[gatewayDocId]?.apiSecret || null;
        if (!secret) return NextResponse.json({ success: false, message: "Secret missing" }, { status: 500 });

        const generated_signature = crypto
          .createHmac('sha256', secret)
          .update(razorpay_order_id + "|" + razorpay_payment_id)
          .digest('hex');

        if (generated_signature !== razorpay_signature) {
          return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 400 });
        }
    }

    // 5. Atomic Onboarding / Settlement Transaction
    const transactionResult = await db.runTransaction(async (transaction) => {
      const phone = orderData?.customerData.phone;
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const customerId = `c_${cleanPhone}`;
      
      const paymentRef = db.doc(`businesses/${businessId}/payments/${razorpay_payment_id}`);
      const bizRef = db.doc(`businesses/${businessId}`);
      
      const paymentSnap = await transaction.get(paymentRef);
      if (paymentSnap.exists) {
        const pData = paymentSnap.data();
        // IDEMPOTENCY: If the payment is already fully captured/settled, return success and skip
        if (pData?.status === 'captured') {
           return { success: true, alreadyProcessed: true, bizData: (await transaction.get(bizRef)).data(), customerPhone: phone };
        }
        // If status is 'captured_unsettled', we proceed to retry the inventory deduction logic below
      }

      const bizSnap = await transaction.get(bizRef);
      const bizData = bizSnap.data();

      // --- FLOW A: STOREFRONT SETTLEMENT ---
      if (orderData?.source === 'storefront') {
        // 1. ATOMIC STOCK RE-VALIDATION (Pass 1)
        let stockIsAvailable = true;
        let failingProductId = "";

        for (const item of orderData.items) {
          const productRef = db.doc(`businesses/${businessId}/products/${item.productId}`);
          const productSnap = await transaction.get(productRef);
          const pData = productSnap.data();

          if (!productSnap.exists || (pData?.stock || 0) < item.quantity) {
             stockIsAvailable = false;
             failingProductId = item.productId;
             break;
          }
        }

        // 2. CASE: INSUFFICIENT STOCK (Recoverable Failure Node)
        if (!stockIsAvailable) {
          transaction.update(orderRef, {
            status: 'payment_captured_unsettled',
            settlementStatus: 'failed',
            settlementFailureReason: 'INSUFFICIENT_STOCK',
            paymentCaptured: true,
            razorpayPaymentId: razorpay_payment_id,
            requiresManualReview: true,
            failedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });

          transaction.set(paymentRef, {
            id: razorpay_payment_id,
            paymentId: razorpay_payment_id,
            orderId: bizOrderId,
            amount: orderData.amount,
            status: 'captured_unsettled', 
            source: 'storefront',
            verifiedAt: FieldValue.serverTimestamp(),
            customerId,
            failureReason: 'INSUFFICIENT_STOCK',
            failingProductId
          }, { merge: true });

          return { 
            success: true, 
            settlementFailed: true, 
            reason: 'INSUFFICIENT_STOCK', 
            bizData, 
            customerPhone: phone, 
            isStorefront: true 
          };
        }

        // 3. CASE: SUCCESSFUL SETTLEMENT (Pass 2)
        for (const item of orderData.items) {
          const productRef = db.doc(`businesses/${businessId}/products/${item.productId}`);
          transaction.update(productRef, { 
            stock: FieldValue.increment(-item.quantity),
            updatedAt: FieldValue.serverTimestamp()
          });
        }

        transaction.update(orderRef, { 
          status: 'paid',
          razorpayPaymentId: razorpay_payment_id,
          settlementStatus: 'success',
          paymentCaptured: true,
          updatedAt: FieldValue.serverTimestamp() 
        });

        transaction.set(paymentRef, {
          id: razorpay_payment_id,
          paymentId: razorpay_payment_id,
          orderId: bizOrderId,
          amount: orderData.amount,
          status: 'captured',
          source: 'storefront',
          verifiedAt: FieldValue.serverTimestamp(),
          customerId
        }, { merge: true });

        return { success: true, bizData, customerPhone: phone, isStorefront: true };
      } 

      // --- FLOW B: MEMBERSHIP ONBOARDING ---
      const tierRef = db.doc(`businesses/${businessId}/loyaltyTiers/${orderData?.tierId}`);
      const membershipId = `mem_${customerId}`;
      const membershipRef = db.doc(`businesses/${businessId}/memberships/${membershipId}`);
      const counterRef = db.doc(`system/counters/memberships/${businessId}`);

      const tierSnap = await transaction.get(tierRef);
      const counterSnap = await transaction.get(counterRef);

      const tierData = tierSnap.data();
      const currentCount = counterSnap.exists ? (counterSnap.data()?.count || 0) : 0;
      const nextSeq = currentCount + 1;
      const cardPrefix = bizData?.cardConfig?.prefix || "BIZ";
      const cardNumber = `${cardPrefix}-${tierData?.name?.toUpperCase() || 'STD'}-${new Date().getFullYear()}-${nextSeq.toString().padStart(4, '0')}`;
      
      const activationDate = new Date();
      let expiryDateStr = "";
      
      // Determine if it's LIFETIME or YEARLY based on planType or name
      if (tierData?.planType === 'LIFETIME' || tierData?.name?.toUpperCase().includes('LIFETIME')) {
        expiryDateStr = 'LIFETIME';
      } else if (tierData?.planType === 'YEARLY' || tierData?.name?.toUpperCase().includes('YEARLY')) {
        const d = new Date(activationDate);
        d.setFullYear(d.getFullYear() + 1);
        expiryDateStr = d.toISOString();
      } else {
        // Default behavior for other plans (e.g., if just 'Standard')
        const d = new Date(activationDate);
        d.setFullYear(d.getFullYear() + 1);
        expiryDateStr = d.toISOString();
      }

      transaction.set(membershipRef, {
        id: membershipId, customerId, customerName: orderData?.customerData.name,
        tier: tierData?.name || 'Standard', status: 'active', registrationType: 'Online',
        startDate: activationDate.toISOString(), expiryDate: expiryDateStr,
        cardNumber, rewardPoints: 0, walletBalance: 0,
        pointsMultiplier: parseFloat(tierData?.pointsMultiplier) || 1,
        cashbackPercent: parseFloat(tierData?.cashbackPercent) || 0,
        createdAt: FieldValue.serverTimestamp()
      }, { merge: true });

      transaction.set(counterRef, { count: nextSeq }, { merge: true });
      transaction.update(orderRef, { status: 'paid' });
      transaction.set(paymentRef, {
        id: razorpay_payment_id, amount: orderData?.amount, status: 'captured', verifiedAt: FieldValue.serverTimestamp(),
        customerId, membershipId, orderId: bizOrderId
      }, { merge: true });

      return { success: true, membershipId, cardNumber, bizData, customerPhone: phone };
    });

    if (transactionResult.settlementFailed) {
      return NextResponse.json({ 
        success: true, 
        message: "Payment captured but inventory settlement failed. Moved to manual review.",
        settlementStatus: 'failed'
      });
    }

    return NextResponse.json({ success: true, message: "Settlement complete" });

  } catch (error: any) {
    console.error("Critical Settlement Error:", error.message);
    return NextResponse.json({ 
      success: false, 
      message: "Internal settlement error",
      code: "INTERNAL_ERROR"
    }, { status: 500 });
  }
}
