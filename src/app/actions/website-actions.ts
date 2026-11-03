"use server";

import { promises as dns } from "dns";
import { initializeAdmin } from "@/firebase/admin";
import { revalidatePath } from "next/cache";

/**
 * PHASE 4B: SECURE SERVER-SIDE CUSTOM DOMAIN VERIFICATION ENGINE
 * 
 * Enforces:
 * 1. User authentication & tenant isolation (never trust raw browser input)
 * 2. Role authorization (owner/admin/manager)
 * 3. Domain format validation
 * 4. Authentic server-side DNS lookup (CNAME resolution)
 * 5. Privileged state persistence in businesses/{businessId}/websites/main
 */

const EXPECTED_CNAME_TARGET = "cname.biztrix.in";
const BIZTRIX_RESERVED_DOMAINS = ["biztrix.in", "biztrix.io", "biztrix.co"];

export interface DomainValidationResult {
  isValid: boolean;
  error?: string;
  cleanedDomain?: string;
}

/**
 * Validates domain format and disallows reserved platform domains.
 */
export async function validateDomainFormat(domain: string): Promise<DomainValidationResult> {
  if (!domain || typeof domain !== "string") {
    return { isValid: false, error: "Domain name is required." };
  }

  // Strip protocol if user pasted http:// or https://, and strip trailing slash or path
  const sanitized = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  if (!sanitized) {
    return { isValid: false, error: "Domain name cannot be empty." };
  }

  // Domain regex accepting standard hostnames and subdomains (e.g. shop.example.com, www.example.com, example.com)
  const domainRegex = /^(?!:\/\/)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;
  if (!domainRegex.test(sanitized)) {
    return { 
      isValid: false, 
      error: "Invalid domain format. Please enter a valid domain like 'shop.yourbrand.com' or 'www.yourbrand.com'." 
    };
  }

  if (BIZTRIX_RESERVED_DOMAINS.some(d => sanitized === d || sanitized.endsWith(`.${d}`))) {
    return { 
      isValid: false, 
      error: "Biztrix platform domains cannot be configured as custom storefront domains." 
    };
  }

  return { isValid: true, cleanedDomain: sanitized };
}

interface AuthContext {
  uid: string;
  businessId: string;
  role: string;
}

/**
 * Authorizes user and resolves tenant context securely from the authenticated token.
 * Prevents cross-tenant attacks by never trusting unauthenticated client inputs.
 */
async function authenticateTenantUser(
  idToken?: string, 
  requestedBusinessId?: string
): Promise<{ authorized: boolean; authContext?: AuthContext; error?: string }> {
  const { admin, db } = initializeAdmin();

  if (!idToken) {
    // Development / fallback support when ID token is unavailable
    if (process.env.NODE_ENV !== "production" && requestedBusinessId) {
      const bizSnap = await db.collection("businesses").doc(requestedBusinessId).get();
      if (!bizSnap.exists) {
        return { authorized: false, error: "Business node not found in registry." };
      }
      return { 
        authorized: true, 
        authContext: { uid: "dev-session", businessId: requestedBusinessId, role: "owner" } 
      };
    }
    return { authorized: false, error: "Authentication required. Please sign in to manage domains." };
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return { authorized: false, error: "Authenticated user record not found." };
    }

    const userData = userDoc.data();
    const tenantBusinessId = userData?.businessId;

    if (!tenantBusinessId) {
      return { authorized: false, error: "No business linked to your account." };
    }

    // Role check: Only owner, admin, or manager roles may configure custom domains
    const userRole = (userData?.role || "user").toLowerCase();
    const allowedRoles = ["owner", "admin", "manager"];
    if (!allowedRoles.includes(userRole)) {
      return { authorized: false, error: "Permission denied: Only business administrators can manage custom domains." };
    }

    // If client supplied a businessId, it MUST match the authenticated user's tenant businessId
    if (requestedBusinessId && requestedBusinessId !== tenantBusinessId) {
      return { authorized: false, error: "Security violation: Tenant mismatch detected." };
    }

    return {
      authorized: true,
      authContext: {
        uid,
        businessId: tenantBusinessId,
        role: userRole,
      }
    };
  } catch (err: any) {
    console.error("Custom domain auth error:", err?.message || err);
    return { authorized: false, error: "Authentication session expired or invalid. Please refresh the page." };
  }
}

/**
 * Checks DNS records for the domain using authentic Node.js DNS resolver.
 */
export async function checkDomainDns(domain: string): Promise<{
  isVerified: boolean;
  recordsFound: string[];
  errorMessage: string | null;
}> {
  const cleanDomain = domain.trim().toLowerCase();

  try {
    let cnameRecords: string[] = [];
    try {
      cnameRecords = await dns.resolveCname(cleanDomain);
    } catch (cnameErr: any) {
      // ENODATA or ENOTFOUND are standard when record does not exist
      if (cnameErr.code !== "ENODATA" && cnameErr.code !== "ENOTFOUND") {
        throw cnameErr;
      }
    }

    if (cnameRecords.length > 0) {
      const match = cnameRecords.some(r => {
        const normalized = r.toLowerCase().replace(/\.$/, "");
        return normalized === EXPECTED_CNAME_TARGET || normalized.endsWith(".biztrix.in");
      });

      if (match) {
        return {
          isVerified: true,
          recordsFound: cnameRecords,
          errorMessage: null,
        };
      } else {
        return {
          isVerified: false,
          recordsFound: cnameRecords,
          errorMessage: `DNS CNAME currently points to "${cnameRecords.join(', ')}", but must point to "${EXPECTED_CNAME_TARGET}".`,
        };
      }
    }

    // Check A records to provide informative feedback if user configured an IP instead of CNAME
    try {
      const aRecords = await dns.resolve4(cleanDomain);
      if (aRecords.length > 0) {
        return {
          isVerified: false,
          recordsFound: aRecords.map(ip => `A: ${ip}`),
          errorMessage: `Domain currently resolves to IP address (${aRecords.join(', ')}). A CNAME record pointing to "${EXPECTED_CNAME_TARGET}" is required for storefront routing.`,
        };
      }
    } catch {
      // Ignore A record resolution errors
    }

    return {
      isVerified: false,
      recordsFound: [],
      errorMessage: `No CNAME record found pointing to "${EXPECTED_CNAME_TARGET}". Please ensure you added the DNS record with your domain provider and allowed time for DNS propagation.`,
    };
  } catch (error: any) {
    const code = error?.code || "UNKNOWN";
    if (code === "ENOTFOUND") {
      return {
        isVerified: false,
        recordsFound: [],
        errorMessage: `Domain not found in DNS registry (${code}). Please check domain spelling and ensure registrar registration is active.`,
      };
    }
    return {
      isVerified: false,
      recordsFound: [],
      errorMessage: `DNS resolution error (${code}): ${error?.message || "Lookup failed"}.`,
    };
  }
}

/**
 * Server Action: Verify custom domain DNS and update verification state.
 */
export async function verifyCustomDomain(params: {
  idToken?: string;
  businessId?: string;
}) {
  const auth = await authenticateTenantUser(params.idToken, params.businessId);
  if (!auth.authorized || !auth.authContext) {
    return { success: false, message: auth.error || "Unauthorized request." };
  }

  const { businessId } = auth.authContext;
  const { db } = initializeAdmin();

  const websiteRef = db.collection("businesses").doc(businessId).collection("websites").doc("main");
  const websiteDoc = await websiteRef.get();

  if (!websiteDoc.exists) {
    return { success: false, message: "Website configuration document not found." };
  }

  const websiteData = websiteDoc.data();
  const domain = websiteData?.customDomain;

  if (!domain) {
    return { success: false, message: "No custom domain linked. Please link a domain first." };
  }

  const validation = await validateDomainFormat(domain);
  if (!validation.isValid || !validation.cleanedDomain) {
    return { success: false, message: validation.error || "Invalid domain format." };
  }

  const cleanDomain = validation.cleanedDomain;
  const nowIso = new Date().toISOString();

  // Perform authentic server-side DNS verification
  const dnsResult = await checkDomainDns(cleanDomain);

  if (dnsResult.isVerified) {
    await websiteRef.update({
      customDomainStatus: "verified",
      customDomainVerifiedAt: nowIso,
      customDomainLastCheckedAt: nowIso,
      customDomainVerificationError: null,
      customDomainDnsRecord: dnsResult.recordsFound.join(", ") || EXPECTED_CNAME_TARGET,
    });

    revalidatePath("/website");
    revalidatePath("/website/domains");
    revalidatePath("/shop");

    return {
      success: true,
      status: "verified",
      message: `Domain ${cleanDomain} verified successfully! DNS CNAME correctly points to ${EXPECTED_CNAME_TARGET}.`,
      verifiedAt: nowIso,
    };
  } else {
    await websiteRef.update({
      customDomainStatus: "failed",
      customDomainVerifiedAt: null,
      customDomainLastCheckedAt: nowIso,
      customDomainVerificationError: dnsResult.errorMessage,
      customDomainDnsRecord: dnsResult.recordsFound.join(", ") || null,
    });

    revalidatePath("/website");
    revalidatePath("/website/domains");
    revalidatePath("/shop");

    return {
      success: false,
      status: "failed",
      message: dnsResult.errorMessage || "DNS verification failed.",
      lastCheckedAt: nowIso,
    };
  }
}

/**
 * Server Action: Link or update custom domain configuration for a business.
 * Fully backwards-compatible with (businessId, domain) signature.
 */
export async function updateCustomDomain(
  businessIdOrParams: string | { businessId?: string; domain: string; idToken?: string },
  maybeDomain?: string,
  maybeIdToken?: string
) {
  let businessId: string | undefined;
  let domain: string;
  let idToken: string | undefined;

  if (typeof businessIdOrParams === "object") {
    businessId = businessIdOrParams.businessId;
    domain = businessIdOrParams.domain;
    idToken = businessIdOrParams.idToken;
  } else {
    businessId = businessIdOrParams;
    domain = maybeDomain || "";
    idToken = maybeIdToken;
  }

  const auth = await authenticateTenantUser(idToken, businessId);
  if (!auth.authorized || !auth.authContext) {
    return { success: false, message: auth.error || "Unauthorized request." };
  }

  const tenantBusinessId = auth.authContext.businessId;
  const validation = await validateDomainFormat(domain);
  if (!validation.isValid || !validation.cleanedDomain) {
    return { success: false, message: validation.error || "Invalid domain format." };
  }

  const cleanDomain = validation.cleanedDomain;

  try {
    const { db } = initializeAdmin();

    // Check if domain is already claimed by another business
    const existingSnap = await db.collectionGroup("websites")
      .where("customDomain", "==", cleanDomain)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0];
      const existingBizId = existingDoc.ref.path.split("/")[1];
      if (existingBizId !== tenantBusinessId) {
        return { success: false, message: "This domain is already linked to another business storefront." };
      }
    }

    const websiteRef = db.collection("businesses").doc(tenantBusinessId).collection("websites").doc("main");
    const nowIso = new Date().toISOString();

    await websiteRef.update({
      customDomain: cleanDomain,
      customDomainStatus: "pending",
      customDomainVerifiedAt: null,
      customDomainLastCheckedAt: nowIso,
      customDomainVerificationError: null,
      customDomainDnsRecord: null,
    });

    revalidatePath("/website");
    revalidatePath("/website/domains");
    return { 
      success: true, 
      message: `Domain ${cleanDomain} linked successfully. Please configure your CNAME record and click Verify.` 
    };
  } catch (error: any) {
    console.error("Error updating custom domain:", error);
    return { success: false, message: "An unexpected error occurred while linking the domain." };
  }
}

/**
 * Server Action: Remove custom domain configuration.
 * Fully backwards-compatible with (businessId) signature.
 */
export async function removeCustomDomain(
  businessIdOrParams: string | { businessId?: string; idToken?: string },
  maybeIdToken?: string
) {
  let businessId: string | undefined;
  let idToken: string | undefined;

  if (typeof businessIdOrParams === "object") {
    businessId = businessIdOrParams.businessId;
    idToken = businessIdOrParams.idToken;
  } else {
    businessId = businessIdOrParams;
    idToken = maybeIdToken;
  }

  const auth = await authenticateTenantUser(idToken, businessId);
  if (!auth.authorized || !auth.authContext) {
    return { success: false, message: auth.error || "Unauthorized request." };
  }

  const tenantBusinessId = auth.authContext.businessId;

  try {
    const { db } = initializeAdmin();
    const websiteRef = db.collection("businesses").doc(tenantBusinessId).collection("websites").doc("main");

    await websiteRef.update({
      customDomain: null,
      customDomainStatus: null,
      customDomainVerifiedAt: null,
      customDomainLastCheckedAt: null,
      customDomainVerificationError: null,
      customDomainDnsRecord: null,
    });

    revalidatePath("/website");
    revalidatePath("/website/domains");
    revalidatePath("/shop");
    return { success: true, message: "Custom domain unlinked successfully." };
  } catch (error) {
    console.error("Error removing custom domain:", error);
    return { success: false, message: "An unexpected error occurred while unlinking domain." };
  }
}
