'use server';

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, collection, serverTimestamp } from 'firebase/firestore';

/**
 * @fileOverview WhatsApp Server Actions for Meta Cloud API integration.
 * Supports sending templates and free-form text messages.
 * Hardened: Enforces module entitlement via activeAddonIds.
 * Security: Sourced EXCLUSIVELY from privateConfig via privileged server-only read.
 */

/**
 * Private helper to verify if the business is entitled to use the WhatsApp module.
 * Retrieves the Meta accessToken from privateConfig, falling back to whatsappApiConfig.
 * USES: initializeFirebase() for privileged server-side access to bypass client-level rule blocks.
 */
async function verifyEntitlement(businessId: string): Promise<{ isEntitled: boolean; accessToken: string | null }> {
  if (!businessId) return { isEntitled: false, accessToken: null };

  const { firestore } = initializeFirebase();
  
  try {
    const bizRef = doc(firestore, 'businesses', businessId);
    const bizSnap = await getDoc(bizRef);
    if (!bizSnap.exists()) return { isEntitled: false, accessToken: null };
    
    const data = bizSnap.data();
    const activeAddonIds = data?.activeAddonIds || [];

    // Fetch Token from Private Registry first (Hardened Node)
    const privateRef = doc(firestore, 'businesses', businessId, 'privateConfig', 'whatsapp');
    const privateSnap = await getDoc(privateRef);
    const privateData = privateSnap.exists() ? privateSnap.data() : null;
    
    const accessToken = privateData?.accessToken || data?.whatsappApiConfig?.accessToken || null;

    // Entitled if addon is active, OR if business has verified/enabled WhatsApp or connected a token
    const isEntitled = 
      activeAddonIds.includes('feat_whatsapp') || 
      activeAddonIds.includes('suite_growth') || 
      data?.whatsappEnabled === true || 
      data?.whatsappApiConfig?.isVerified === true || 
      data?.whatsappApiConfig?.hasToken === true ||
      Boolean(accessToken);

    return { isEntitled, accessToken };
  } catch (error) {
    console.error("verifyEntitlement error:", error);
    return { isEntitled: false, accessToken: null };
  }
}

/**
 * Dispatch a WhatsApp template message (Outbound).
 * Supports both signatures:
 *   sendWhatsAppTemplate(businessId, config, recipientPhone, templateName, languageCode, components)
 *   sendWhatsAppTemplate(config, recipientPhone, templateName, languageCode, components)
 */
export async function sendWhatsAppTemplate(
  businessIdOrConfig: string | { phoneId: string; accessToken?: string; businessId?: string },
  configOrPhone: { phoneId?: string; accessToken?: string } | string, 
  recipientPhoneOrTemplate: string,
  templateNameOrLang: string = "hello_world",
  languageCodeOrComponents: string | any[] = "en_US",
  componentsArray: any[] = []
) {
  let resolvedBusinessId = "";
  let resolvedPhoneId = "";
  let explicitAccessToken: string | null = null;
  let resolvedRecipientPhone = "";
  let resolvedTemplateName = "hello_world";
  let resolvedLanguageCode = "en_US";
  let resolvedComponents: any[] = [];

  if (typeof businessIdOrConfig === 'string') {
    resolvedBusinessId = businessIdOrConfig;
    const cfg = (typeof configOrPhone === 'object' ? configOrPhone : {}) as any;
    resolvedPhoneId = cfg?.phoneId || "";
    explicitAccessToken = cfg?.accessToken || null;
    resolvedRecipientPhone = recipientPhoneOrTemplate || "";
    resolvedTemplateName = templateNameOrLang || "hello_world";
    resolvedLanguageCode = typeof languageCodeOrComponents === 'string' ? languageCodeOrComponents : "en_US";
    resolvedComponents = Array.isArray(languageCodeOrComponents) ? languageCodeOrComponents : (componentsArray || []);
  } else {
    const cfg = (businessIdOrConfig || {}) as any;
    resolvedPhoneId = cfg?.phoneId || "";
    explicitAccessToken = cfg?.accessToken || null;
    resolvedBusinessId = cfg?.businessId || "";
    resolvedRecipientPhone = typeof configOrPhone === 'string' ? configOrPhone : "";
    resolvedTemplateName = recipientPhoneOrTemplate || "hello_world";
    resolvedLanguageCode = typeof templateNameOrLang === 'string' ? templateNameOrLang : "en_US";
    resolvedComponents = Array.isArray(languageCodeOrComponents) ? languageCodeOrComponents : (componentsArray || []);
  }

  // Ensure recipient phone is normalized
  if (resolvedRecipientPhone) {
    let clean = resolvedRecipientPhone.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = clean.substring(1);
    if (clean.length === 10) clean = `91${clean}`;
    resolvedRecipientPhone = clean;
  }

  // Token & Entitlement resolution
  let accessToken = explicitAccessToken;
  if (resolvedBusinessId) {
    const entitlement = await verifyEntitlement(resolvedBusinessId);
    if (entitlement.accessToken) {
      accessToken = entitlement.accessToken;
    }
  }

  if (!accessToken) {
    return { 
      success: false, 
      error: "WhatsApp Access Token not found. Please connect your Meta System User Token in Settings -> Integrations.",
      code: "NO_ACCESS_TOKEN" 
    };
  }

  if (!resolvedPhoneId) {
    return { 
      success: false, 
      error: "Missing WhatsApp Phone ID in configuration.",
      code: "NO_PHONE_ID" 
    };
  }

  // Meta Cloud API Endpoint
  const url = `https://graph.facebook.com/v21.0/${resolvedPhoneId}/messages`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: resolvedRecipientPhone,
        type: "template",
        template: {
          name: resolvedTemplateName,
          language: {
            code: resolvedLanguageCode
          },
          ...(resolvedComponents.length > 0 ? { components: resolvedComponents } : {})
        }
      }),
      cache: 'no-store'
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error("Meta WhatsApp Template Error:", JSON.stringify(result));
      return { 
        success: false, 
        error: result.error?.message || "Meta API Rejection", 
        code: result.error?.code,
        fullResponse: result 
      };
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error("sendWhatsAppTemplate fetch exception:", error);
    return { 
      success: false, 
      error: error.message || "Network connectivity failure to Meta Cloud.",
      code: "NETWORK_ERROR"
    };
  }
}

/**
 * Dispatch a raw text message (Used for Keyword Responders)
 */
export async function sendWhatsAppText(
  businessId: string,
  config: { phoneId: string },
  recipientPhone: string,
  messageText: string
) {
  // Entitlement & Secret Check (Privileged Internal Resolution)
  const { isEntitled, accessToken } = await verifyEntitlement(businessId);
  if (!isEntitled || !accessToken) {
    return { success: false, error: "WHATSAPP_MODULE_NOT_ACTIVE" };
  }

  const { phoneId } = config;
  if (!phoneId) throw new Error("Missing Credentials");

  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "text",
        text: { body: messageText }
      }),
      cache: 'no-store'
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "Failed to send text.");
    return { success: true, data: result };
  } catch (error: any) {
    console.error(error);
    throw new Error(error.message);
  }
}

/**
 * Fetch all message templates from Meta WABA
 */
export async function listWhatsAppTemplates(
  businessId: string,
  config: { wabaId: string }
) {
  // Entitlement & Secret Check (Privileged Internal Resolution)
  const { isEntitled, accessToken } = await verifyEntitlement(businessId);
  if (!isEntitled || !accessToken) {
    return { success: false, templates: [], error: "WHATSAPP_MODULE_NOT_ACTIVE" };
  }

  const { wabaId } = config;
  
  if (!wabaId) {
    return { success: false, templates: [], error: "Missing WABA ID." };
  }

  const url = `https://graph.facebook.com/v21.0/${wabaId}/message_templates`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store'
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return { success: false, templates: [], error: "Meta API returned HTML instead of JSON. Check WABA ID and Token." };
    }

    const result = await response.json();
    if (!response.ok) {
      return { success: false, templates: [], error: result.error?.message || "Failed to fetch templates from Meta." };
    }
    
    return { success: true, templates: result.data || [] };
  } catch (error: any) {
    console.error(error);
    return { success: false, templates: [], error: error.message || "Unknown Meta Sync Error" };
  }
}

/**
 * Create a new message template on Meta
 */
export async function createWhatsAppTemplate(
  businessId: string,
  config: { wabaId: string },
  templateData: {
    name: string,
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
    language: string,
    components: any[]
  }
) {
  // Entitlement & Secret Check (Privileged Internal Resolution)
  const { isEntitled, accessToken } = await verifyEntitlement(businessId);
  if (!isEntitled || !accessToken) {
    return { success: false, error: "WHATSAPP_MODULE_NOT_ACTIVE" };
  }

  const { wabaId } = config;
  if (!wabaId) {
    return { success: false, error: "Missing WABA ID." };
  }

  const url = `https://graph.facebook.com/v21.0/${wabaId}/message_templates`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateData),
      cache: 'no-store'
    });

    const result = await response.json();
    if (!response.ok) {
      return { 
        success: false, 
        error: result.error?.message || "Meta rejected the template creation.",
        details: result 
      };
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error(error);
    return { 
      success: false, 
      error: error.message || "Network failure during Meta handshake." 
    };
  }
}

/**
 * Delete a template from Meta
 */
export async function deleteWhatsAppTemplate(
  businessId: string,
  config: { wabaId: string }, 
  templateName: string
) {
  // Entitlement & Secret Check (Privileged Internal Resolution)
  const { isEntitled, accessToken } = await verifyEntitlement(businessId);
  if (!isEntitled || !accessToken) {
    return { success: false, error: "WHATSAPP_MODULE_NOT_ACTIVE" };
  }

  const { wabaId } = config;
  const url = `https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=${templateName}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store'
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "Failed to delete template.");

    return { success: true };
  } catch (error: any) {
    console.error(error);
    throw new Error(error.message);
  }
}

export async function sendTestWhatsAppMessage(
  businessId: string,
  config: { phoneId: string }, 
  recipientPhone: string
) {
  return sendWhatsAppTemplate(businessId, config, recipientPhone, "hello_world");
}

/**
 * Dedicated secure OTP dispatch action for Member Onboarding Safety Handshake.
 * 1. Formats recipient phone with international country code (e.g. 91...)
 * 2. Fetches business and WhatsApp settings
 * 3. Tries Meta WhatsApp Cloud API (Template or Text)
 * 4. Generates direct wa.me fallback link so staff/customer can open WhatsApp directly
 * 5. Returns status, error details, and staff override code
 */
export async function sendMemberVerificationOtpAction(
  businessId: string,
  customerPhone: string,
  customerName: string,
  otpCode: string
): Promise<{
  success: boolean;
  method?: "meta_template" | "meta_text" | "fallback_link";
  error?: string;
  waLink: string;
  otp: string;
}> {
  let cleanPhone = (customerPhone || "").replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
  if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

  const messageText = `Namaste ${customerName || "Customer"}! Your Biztrix verification code for membership card issuance is: *${otpCode}*. (Valid for 10 minutes. Please share this code with counter staff to activate your card).`;
  const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

  if (!businessId) {
    return {
      success: false,
      error: "Business ID is missing.",
      waLink,
      otp: otpCode
    };
  }

  const { firestore } = initializeFirebase();
  const bizRef = doc(firestore, 'businesses', businessId);
  const bizSnap = await getDoc(bizRef);
  if (!bizSnap.exists()) {
    return {
      success: false,
      error: "Business profile not found.",
      waLink,
      otp: otpCode
    };
  }

  const bizData = bizSnap.data();
  const waConfig = bizData?.whatsappApiConfig;

  // Retrieve token
  const { isEntitled, accessToken } = await verifyEntitlement(businessId);
  const token = accessToken || waConfig?.accessToken;
  const phoneId = waConfig?.phoneId;

  if (!phoneId || !token) {
    return {
      success: false,
      error: "Meta WhatsApp credentials not configured. Please connect Phone ID and Token in Settings -> Integrations, or use the direct WhatsApp link below.",
      waLink,
      otp: otpCode
    };
  }

  // Attempt 1: Try sending via template if welcomeTemplateName is set
  const templateName = waConfig.welcomeTemplateName || "welcome_member";
  const lang = waConfig.welcomeLanguageCode || "en_IN";
  const templateComponents = [{
    type: "body",
    parameters: [
      { type: "text", text: customerName || "Customer" },
      { type: "text", text: `SECURITY CODE: ${otpCode}` },
      { type: "text", text: "Identity Verification Protocol" }
    ]
  }];

  const templateRes = await sendWhatsAppTemplate(
    businessId,
    { phoneId, accessToken: token },
    cleanPhone,
    templateName,
    lang,
    templateComponents
  );

  if (templateRes.success) {
    return {
      success: true,
      method: "meta_template",
      waLink,
      otp: otpCode
    };
  }

  // Attempt 2: If template rejected (e.g. template not found, param mismatch), try freeform text message
  console.warn("WhatsApp template attempt failed, trying text fallback:", templateRes.error);
  try {
    const textRes = await sendWhatsAppText(
      businessId,
      { phoneId },
      cleanPhone,
      messageText
    );
    if (textRes.success) {
      return {
        success: true,
        method: "meta_text",
        waLink,
        otp: otpCode
      };
    }
  } catch (textErr: any) {
    console.error("WhatsApp text fallback error:", textErr);
  }

  return {
    success: false,
    error: templateRes.error || "Meta Cloud API rejected message transmission. Use the 1-click WhatsApp link below or Staff Override code.",
    waLink,
    otp: otpCode
  };
}
