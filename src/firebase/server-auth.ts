import { initializeAdmin } from '@/firebase/admin';
import { isPermissionDeniedError, restGetDoc } from '@/firebase/firestore-rest';

export interface AuthTenantResult {
  authorized: boolean;
  uid?: string;
  businessId?: string;
  role?: string;
  useRestFallback?: boolean;
  error?: string;
}

/**
 * Verifies Firebase ID token (when provided), fetches the user profile via Admin SDK
 * with automatic Firestore REST fallback when Admin ADC lacks IAM permissions,
 * and enforces tenant isolation + role permissions.
 */
export async function authenticateMerchantServer(options: {
  userId?: string;
  requestedBusinessId?: string;
  idToken?: string;
  allowedRoles?: string[];
  requireIdToken?: boolean;
}): Promise<AuthTenantResult> {
  const {
    userId,
    requestedBusinessId,
    idToken,
    allowedRoles = ['owner', 'admin', 'manager', 'staff'],
    requireIdToken = false,
  } = options;

  const { admin, db } = initializeAdmin();

  if (requireIdToken && !idToken) {
    return { authorized: false, error: 'AUTHENTICATION_TOKEN_REQUIRED' };
  }

  let verifiedUid = userId;
  if (idToken) {
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      if (userId && decoded.uid !== userId) {
        return { authorized: false, error: 'TOKEN_UID_MISMATCH' };
      }
      verifiedUid = decoded.uid;
    } catch (e: any) {
      return { authorized: false, error: `INVALID_AUTH_TOKEN: ${e?.message || 'Verification failed'}` };
    }
  }

  if (!verifiedUid) {
    return { authorized: false, error: 'MISSING_AUTHENTICATION_CONTEXT' };
  }

  let userData: Record<string, any> | undefined;
  let useRestFallback = false;

  try {
    const userSnap = await db.doc(`users/${verifiedUid}`).get();
    if (!userSnap.exists) {
      return { authorized: false, error: 'USER_PROFILE_NOT_FOUND' };
    }
    userData = userSnap.data();
  } catch (err: any) {
    if (isPermissionDeniedError(err)) {
      try {
        const restSnap = await restGetDoc(`users/${verifiedUid}`, idToken);
        if (!restSnap.exists) {
          return { authorized: false, error: 'USER_PROFILE_NOT_FOUND' };
        }
        userData = restSnap.data();
        useRestFallback = true;
      } catch (restErr: any) {
        return { authorized: false, error: `FIRESTORE_ACCESS_ERROR: ${restErr.message}` };
      }
    } else {
      return { authorized: false, error: `FIRESTORE_ACCESS_ERROR: ${err.message}` };
    }
  }

  const userBusinessId = userData?.businessId || userData?.tenantId;
  if (!userBusinessId) {
    return { authorized: false, error: 'NO_TENANT_LINKED' };
  }

  if (requestedBusinessId && userBusinessId !== requestedBusinessId) {
    return { authorized: false, error: 'TENANT_MISMATCH_SECURITY_VIOLATION' };
  }

  const role = String(userData?.role || 'staff').toLowerCase();
  if (!allowedRoles.map((r) => r.toLowerCase()).includes(role)) {
    return { authorized: false, error: 'INSUFFICIENT_ROLE_PERMISSIONS' };
  }

  return {
    authorized: true,
    uid: verifiedUid,
    businessId: userBusinessId,
    role,
    useRestFallback,
  };
}
