import { NextResponse } from 'next/server';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore,
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  limit, 
  setDoc, 
  serverTimestamp, 
  updateDoc, 
  increment,
  addDoc
} from 'firebase/firestore';
import { sendWhatsAppText } from '@/app/actions/whatsapp-actions';

/**
 * @fileOverview WhatsApp Webhook Handler for Meta Cloud API.
 * Server-side Firebase initialization to prevent client-bundle errors.
 * Entitlement: Restricted to businesses with 'feat_whatsapp' or 'suite_growth'.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === 'biztrix_node_v3') {
    return new Response(challenge, { status: 200 });
  }
  
  return new Response('Verification failed', { status: 403 });
}

export async function POST(request: Request) {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const firestore = getFirestore(app);

  const body = await request.json();

  // 1. Basic Validation
  if (!body.object) return NextResponse.json({ status: 'ok' });

  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const metadata = value?.metadata;

  if (!value) return NextResponse.json({ status: 'ok' });

  try {
    // 2. Resolve Business Context using Phone Number ID
    const phoneId = metadata?.phone_number_id;
    if (!phoneId) return NextResponse.json({ status: 'ok' });

    const bizQuery = query(collection(firestore, 'businesses'), where('whatsappApiConfig.phoneId', '==', phoneId));
    const bizSnap = await getDocs(bizQuery);
    
    if (bizSnap.empty) return NextResponse.json({ error: 'Business node not found' }, { status: 404 });
    
    const businessId = bizSnap.docs[0].id;
    const businessData = bizSnap.docs[0].data();

    // 3. Early Entitlement Gate (Fix P1: Inbound Logic Leak)
    // Only process automation or logging if the business has a paid WhatsApp addon.
    // 'suite_solar' alone does NOT grant access.
    const activeAddonIds = businessData?.activeAddonIds || [];
    const isEntitled = activeAddonIds.includes('feat_whatsapp') || activeAddonIds.includes('suite_growth');

    if (!isEntitled) {
      // Return 200 OK to Meta to acknowledge receipt, but stop all business processing.
      return NextResponse.json({ status: 'ok', info: 'WHATSAPP_MODULE_NOT_ACTIVE' });
    }

    const config = businessData.whatsappApiConfig;

    // 4. Handle Status Updates (Ticks: Sent, Delivered, Read)
    if (value.statuses && value.statuses.length > 0) {
      const statusUpdate = value.statuses[0];
      const messageId = statusUpdate.id; // wam_id
      const status = statusUpdate.status; // delivered, read, etc.
      const recipientPhone = statusUpdate.recipient_id;

      // Find the message in the chat sub-collection
      const messagesRef = collection(firestore, 'businesses', businessId, 'chats', recipientPhone, 'messages');
      const msgQuery = query(messagesRef, where('wam_id', '==', messageId), limit(1));
      const msgSnap = await getDocs(msgQuery);

      if (!msgSnap.empty) {
        const msgDocRef = doc(firestore, 'businesses', businessId, 'chats', recipientPhone, 'messages', msgSnap.docs[0].id);
        await updateDoc(msgDocRef, {
          status: status,
          updatedAt: serverTimestamp()
        });
      }
      return NextResponse.json({ status: 'status_updated' });
    }

    // 5. Handle Incoming Messages
    if (value.messages && value.messages.length > 0) {
      const message = value.messages[0];
      const from = message.from; 
      const text = (message.text?.body || message.button?.text || "").trim();
      const messageId = message.id;

      const chatRef = doc(firestore, 'businesses', businessId, 'chats', from);
      const messagesRef = collection(firestore, 'businesses', businessId, 'chats', from, 'messages');

      // Resolve Customer Name
      const custQuery = query(collection(firestore, 'businesses', businessId, 'customers'), where('phone', '>=', from.slice(-10)), limit(1));
      const custSnap = await getDocs(custQuery);
      const customer = custSnap.empty ? null : custSnap.docs[0].data();

      // Update Chat Root
      await setDoc(chatRef, {
        id: from,
        customerName: customer?.name || "Customer Node",
        lastMessage: text || "Media Received",
        lastMessageAt: serverTimestamp(),
        lastInboundAt: serverTimestamp(),
        unreadCount: increment(1),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Add to Message Thread
      await addDoc(messagesRef, {
        wam_id: messageId,
        text: text || "Inbound Attachment",
        direction: 'inbound',
        type: 'text',
        timestamp: serverTimestamp(),
        status: 'read'
      });

      // 6. Keyword Automation (Optional)
      if (businessData.whatsappEnabled && config?.isVerified) {
        const kwQuery = query(collection(firestore, 'businesses', businessId, 'whatsappKeywords'), where('isEnabled', '==', true));
        const kwSnap = await getDocs(kwQuery);
        const keywords = kwSnap.docs.map(d => d.data());

        const lowercaseText = text.toLowerCase();
        const match = keywords.find(k => {
          const kwList = k.keywords.toLowerCase().split(',').map((s: string) => s.trim()).filter(Boolean);
          return k.matchType === 'exact' ? kwList.includes(lowercaseText) : kwList.some((s: string) => lowercaseText.includes(s));
        });

        if (match) {
          const res = await sendWhatsAppText(
            businessId,
            { phoneId: config.phoneId },
            from,
            match.template
          );

          if (res.success) {
            await addDoc(messagesRef, {
              wam_id: res.data?.messages?.[0]?.id || `auto_${Date.now()}`,
              text: match.template,
              direction: 'outbound',
              type: 'text',
              timestamp: serverTimestamp(),
              status: 'sent',
              isAutoReply: true
            });
          }
        }
      }
    }

    return NextResponse.json({ status: 'node_processed' });
  } catch (error) {
    console.error('Critical Webhook Failure:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
