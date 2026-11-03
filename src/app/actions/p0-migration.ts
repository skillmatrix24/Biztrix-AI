'use server';
/**
 * @fileOverview P0 Security Hardening: Credential Migration & Purge Node.
 * Performs copy and purge of sensitive credentials.
 * Boundary: Server-only execution via privileged Firebase SDK.
 */

import { initializeFirebase } from '@/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  updateDoc,
  deleteField,
  query,
  where,
  limit
} from 'firebase/firestore';

export type MigrationReport = {
  whatsapp: {
    found: number;
    migrated: number;
    alreadyMigrated: number;
    skipped: number;
    failed: number;
  };
  payments: {
    found: number;
    migrated: number;
    alreadyMigrated: number;
    skipped: number;
    failed: number;
  };
  success: boolean;
};

/**
 * Executes the P0 Stage 2A Migration Protocol.
 * RULE: Copy only. Do NOT delete legacy data.
 */
export async function runCredentialMigration(): Promise<MigrationReport> {
  const { firestore } = initializeFirebase();
  const report: MigrationReport = {
    whatsapp: { found: 0, migrated: 0, alreadyMigrated: 0, skipped: 0, failed: 0 },
    payments: { found: 0, migrated: 0, alreadyMigrated: 0, skipped: 0, failed: 0 },
    success: false
  };

  try {
    const businessesSnap = await getDocs(collection(firestore, 'businesses'));
    
    for (const bizDoc of businessesSnap.docs) {
      const businessId = bizDoc.id;
      const bizData = bizDoc.data();

      // --- WHATSAPP MIGRATION ---
      const legacyToken = bizData.whatsappApiConfig?.accessToken;
      if (legacyToken) {
        report.whatsapp.found++;
        const privateWARef = doc(firestore, 'businesses', businessId, 'privateConfig', 'whatsapp');
        const privateWASnap = await getDoc(privateWARef);
        
        if (privateWASnap.exists() && privateWASnap.data().accessToken === legacyToken) {
          report.whatsapp.alreadyMigrated++;
        } else {
          try {
            await setDoc(privateWARef, { 
              accessToken: legacyToken, 
              migratedAt: serverTimestamp(),
              migrationSource: 'businesses/{id}.whatsappApiConfig'
            }, { merge: true });
            report.whatsapp.migrated++;
          } catch (e) {
    console.error(e);
            report.whatsapp.failed++;
          }
        }
      } else {
        report.whatsapp.skipped++;
      }

      // --- PAYMENTS MIGRATION ---
      const gatewaysRef = collection(firestore, 'businesses', businessId, 'paymentGatewayConfigs');
      const gatewaysSnap = await getDocs(gatewaysRef);
      
      if (!gatewaysSnap.empty) {
        const privateGatewaysRef = doc(firestore, 'businesses', businessId, 'privateConfig', 'gateways');
        const privateGatewaysSnap = await getDoc(privateGatewaysRef);
        const privateData = privateGatewaysSnap.exists() ? privateGatewaysSnap.data() : {};
        let needsUpdate = false;
        const newPrivateData: any = { ...privateData };

        for (const gwDoc of gatewaysSnap.docs) {
          const gwId = gwDoc.id;
          const gwData = gwDoc.data();
          const legacySecret = gwData.apiSecret;

          if (legacySecret) {
            report.payments.found++;
            if (privateData[gwId]?.apiSecret === legacySecret) {
              report.payments.alreadyMigrated++;
            } else {
              newPrivateData[gwId] = { 
                apiSecret: legacySecret,
                migratedAt: new Date().toISOString()
              };
              needsUpdate = true;
              report.payments.migrated++;
            }
          }
        }

        if (needsUpdate) {
          try {
            await setDoc(privateGatewaysRef, {
              ...newPrivateData,
              updatedAt: serverTimestamp(),
              migrationSource: 'businesses/{id}/paymentGatewayConfigs/*'
            }, { merge: true });
          } catch (e) {
    console.error(e);
            report.payments.failed += (report.payments.found - report.payments.alreadyMigrated);
          }
        }
      }
    }

    report.success = true;
    return report;
  } catch (error) {
    console.error("Migration Node Critical Failure:", error);
    return report;
  }
}

/**
 * Executes the P0 Stage 4B Purge Protocol.
 * RULE: Delete legacy fields ONLY if private counterparts are verified.
 */
export async function runCredentialPurge() {
  const { firestore } = initializeFirebase();
  const report = { whatsapp: 0, payments: 0, success: false };

  try {
    const businessesSnap = await getDocs(collection(firestore, 'businesses'));
    
    for (const bizDoc of businessesSnap.docs) {
      const businessId = bizDoc.id;
      const bizData = bizDoc.data();

      // 1. WhatsApp Purge
      if (bizData.whatsappApiConfig?.accessToken) {
        const privateRef = doc(firestore, 'businesses', businessId, 'privateConfig', 'whatsapp');
        const privateSnap = await getDoc(privateRef);
        
        if (privateSnap.exists() && privateSnap.data().accessToken) {
          const bizRef = doc(firestore, 'businesses', businessId);
          await updateDoc(bizRef, {
            'whatsappApiConfig.accessToken': deleteField()
          });
          report.whatsapp++;
        }
      }

      // 2. Payments Purge
      const gatewaysRef = collection(firestore, 'businesses', businessId, 'paymentGatewayConfigs');
      const gatewaysSnap = await getDocs(gatewaysRef);
      
      if (!gatewaysSnap.empty) {
        const privateRef = doc(firestore, 'businesses', businessId, 'privateConfig', 'gateways');
        const privateSnap = await getDoc(privateRef);
        
        if (privateSnap.exists()) {
          const privateData = privateSnap.data();
          for (const gwDoc of gatewaysSnap.docs) {
            const gwId = gwDoc.id;
            const gwData = gwDoc.data();
            
            if (gwData.apiSecret && privateData[gwId]?.apiSecret) {
              const gwRef = doc(firestore, 'businesses', businessId, 'paymentGatewayConfigs', gwId);
              await updateDoc(gwRef, {
                apiSecret: deleteField()
              });
              report.payments++;
            }
          }
        }
      }
    }
    report.success = true;
  } catch (e) {
    console.error("Purge Error:", e);
  }
  return report;
}

/**
 * PRIVILEGED METADATA RESOLVERS (Phase 16)
 * Returns non-secret business info for public pages when rules block direct read.
 */
export async function getPublicBusinessNode(businessId: string) {
  const { firestore } = initializeFirebase();
  const bizRef = doc(firestore, 'businesses', businessId);
  const snap = await getDoc(bizRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    address: data.address,
    status: data.status,
    currency: data.currency,
    logoUrl: data.logoUrl,
    faviconUrl: data.faviconUrl,
    activeAddonIds: data.activeAddonIds || [],
    trialEndDate: data.trialEndDate ? data.trialEndDate.toDate().toISOString() : null,
    gstMode: data.gstMode || 'exclusive',
    defaultGstRate: data.defaultGstRate || 18,
    cardConfig: data.cardConfig,
    offerGroups: data.offerGroups || [],
    slug: data.slug || null
  };
}

/**
 * PRIVILEGED SLUG RESOLVER (Phase 2B)
 * Resolves businessId from a public slug.
 */
export async function getBusinessIdBySlug(slug: string): Promise<string | null> {
  const { firestore } = initializeFirebase();
  const q = query(
    collection(firestore, 'businesses'),
    where('slug', '==', slug.toLowerCase()),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

/**
 * PRIVILEGED GATEWAY METADATA
 * Lists active gateways without exposing secrets.
 */
export async function listGatewayMetadata(businessId: string) {
  const { firestore } = initializeFirebase();
  const collRef = collection(firestore, 'businesses', businessId, 'paymentGatewayConfigs');
  const snap = await getDocs(collRef);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      provider: data.provider,
      apiKey: data.apiKey,
      isActive: data.isActive
    };
  });
}
