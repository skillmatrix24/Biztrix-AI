import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { initializeAdmin } from '@/firebase/admin';
import { isPermissionDeniedError, restGetDoc, restQueryCollection } from '@/firebase/firestore-rest';
import { calculateGST } from '@/lib/mock-db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessId, tierId, orderId, name, phone, couponCode } = body;

    if (!businessId || (!tierId && !orderId)) {
      return NextResponse.json({ success: false, message: "Required parameters missing." }, { status: 400 });
    }

    const { db, admin } = initializeAdmin();

    let finalAmountPaise = 0;
    let currency = "INR";
    let rzpNotes: any = { businessId, name, phone, couponCode: couponCode || "" };

    let business: Record<string, any> | undefined;
    try {
      const bizSnap = await db.doc(`businesses/${businessId}`).get();
      if (!bizSnap.exists) {
        return NextResponse.json({ success: false, message: "Business node not found." }, { status: 404 });
      }
      business = bizSnap.data()!;
    } catch (adminErr: any) {
      if (isPermissionDeniedError(adminErr)) {
        // Check if gateway is configured publicly via REST to return an accurate message
        const gwDocs = await restQueryCollection(`businesses/${businessId}`, 'paymentGatewayConfigs', {
          where: [{ field: 'provider', value: 'RAZORPAY' }, { field: 'isActive', value: true }],
          limit: 1,
        }).catch(() => []);
        if (gwDocs.length === 0) {
          return NextResponse.json(
            {
              success: false,
              code: 'GATEWAY_NOT_ACTIVE',
              message: 'Online payment gateway is not active for this store. Please choose Cash on Delivery or Order via WhatsApp.',
            },
            { status: 403 }
          );
        }
        return NextResponse.json(
          {
            success: false,
            code: 'IAM_REQUIRED',
            message: 'Online gateway secret access requires production App Hosting IAM. Please use Cash on Delivery or Order via WhatsApp in preview.',
          },
          { status: 503 }
        );
      }
      throw adminErr;
    }
    currency = business.currency || "INR";

    if (orderId) {
      // --- STOREFRONT ORDER FLOW ---
      const orderRef = db.doc(`businesses/${businessId}/orders/${orderId}`);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) {
        return NextResponse.json({ success: false, message: "Order node not found." }, { status: 404 });
      }
      const orderData = orderSnap.data()!;
      
      // Safety: Only allow initiation for 'created' status (unpaid)
      if (orderData.status !== 'created') {
        return NextResponse.json({ success: false, message: "Order is already processed or invalid." }, { status: 400 });
      }

      // Authoritative amount from DB (already calculated on server during creation)
      finalAmountPaise = Math.round((parseFloat(orderData.amount) || 0) * 100);
      rzpNotes.orderId = orderId;
      rzpNotes.type = "storefront";
    } else {
      // --- LOYALTY TIER FLOW ---
      const tierRef = db.doc(`businesses/${businessId}/loyaltyTiers/${tierId!}`);
      const tierSnap = await tierRef.get();
      if (!tierSnap.exists) {
        return NextResponse.json({ success: false, message: "Target configuration not found." }, { status: 404 });
      }
      const tier = tierSnap.data()!;

      // Process Coupon Discount (if provided)
      let discountValue = 0;
      if (couponCode) {
        const couponRef = db.doc(`businesses/${businessId}/coupons/${couponCode.toUpperCase()}`);
        const couponSnap = await couponRef.get();
        
        if (couponSnap.exists) {
          const cData = couponSnap.data()!;
          const baseAmount = parseFloat(tier.minSpend) || 0;

          if (cData.status === 'active' && baseAmount >= (cData.minOrder || 0)) {
            if (cData.type === 'percentage') {
              discountValue = (baseAmount * (parseFloat(cData.value) / 100));
              if (cData.maxDiscount) discountValue = Math.min(discountValue, parseFloat(cData.maxDiscount));
            } else if (cData.type === 'fixed') {
              discountValue = parseFloat(cData.value);
            }
          }
        }
      }

      const base = Math.max(0, (parseFloat(tier.minSpend) || 0) - discountValue);
      const gstRate = (tier.gstRate !== undefined && tier.gstRate !== null) ? parseFloat(tier.gstRate) : (parseFloat(business.defaultGstRate) || 18);
      const gstData = calculateGST(base, gstRate, false, business.gstMode || 'exclusive');
      
      finalAmountPaise = Math.round(gstData.lineTotal * 100); 

      rzpNotes.tierId = tierId;
      rzpNotes.type = "membership";
    }

    if (finalAmountPaise < 100) {
      return NextResponse.json({ success: false, message: "Minimum transaction amount must be ₹1.00" }, { status: 400 });
    }

    // 2. Resolve Active Razorpay Gateway
    const gatewaySnap = await db.collection(`businesses/${businessId}/paymentGatewayConfigs`)
      .where('provider', '==', 'RAZORPAY')
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (gatewaySnap.empty) {
      return NextResponse.json({ success: false, message: "Payment Gateway not active." }, { status: 403 });
    }
    
    const gatewayDocId = gatewaySnap.docs[0].id;
    const rzpConfig = gatewaySnap.docs[0].data()!;

    // 3. Resolve Secret EXCLUSIVELY from Private Registry (Hardened Node)
    const privateRef = db.doc(`businesses/${businessId}/privateConfig/gateways`);
    const privateSnap = await privateRef.get();
    const privateData = privateSnap.exists ? (privateSnap.data() || {}) : {};

    const secret = process.env.RAZORPAY_KEY_SECRET || privateData[gatewayDocId]?.apiSecret || null;

    if (!secret) {
      return NextResponse.json({ success: false, message: "Gateway credentials not fully established." }, { status: 500 });
    }

    // 4. Create Razorpay Order
    try {
      const razorpay = new Razorpay({
        key_id: rzpConfig.apiKey,
        key_secret: secret,
      });

      const rzpOrder = await razorpay.orders.create({
        amount: finalAmountPaise,
        currency: currency,
        receipt: `rcpt_${orderId || tierId}_${Date.now()}`,
        notes: rzpNotes
      });

      // 5. Update/Buffer Order Node in Firestore (Privileged Write)
      if (orderId) {
        // Link RZP order to the Biztrix Storefront Order
        await db.doc(`businesses/${businessId}/orders/${orderId}`).update({
          razorpayOrderId: rzpOrder.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Buffer new order document for memberships (existing pattern)
        await db.doc(`businesses/${businessId}/orders/${rzpOrder.id}`).set({
          id: rzpOrder.id,
          businessId,
          tierId,
          amount: finalAmountPaise,
          currency: rzpOrder.currency,
          customerData: { name, phone },
          status: 'created',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      return NextResponse.json({ 
        success: true, 
        orderId: rzpOrder.id, 
        amount: rzpOrder.amount, 
        currency: rzpOrder.currency,
        keyId: rzpConfig.apiKey 
      });
    } catch (rzpErr: any) {
    console.error(rzpErr);
      return NextResponse.json({ success: false, message: rzpErr.message }, { status: 500 });
    }

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
