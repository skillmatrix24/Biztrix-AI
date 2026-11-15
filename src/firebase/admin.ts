import * as admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const globalForAdmin = globalThis as typeof globalThis & {
  __biztrixAdminDb?: Firestore;
  __biztrixAdminSettingsApplied?: boolean;
};

/**
 * Initializes the Firebase Admin SDK for server-side privileged operations.
 * Targets the (default) Firestore database matching the client SDK.
 */
export function initializeAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId || "studio-763845891-d07da",
    });
  }

  if (!globalForAdmin.__biztrixAdminDb) {
    const db = getFirestore(admin.app());
    if (!globalForAdmin.__biztrixAdminSettingsApplied) {
      try {
        db.settings({ ignoreUndefinedProperties: true });
      } catch (err: any) {
        // Ignore if another server chunk already initialized this Firestore singleton
        if (!String(err?.message || '').toLowerCase().includes('already been initialized')) {
          throw err;
        }
      }
      globalForAdmin.__biztrixAdminSettingsApplied = true;
    }
    globalForAdmin.__biztrixAdminDb = db;
  }

  return {
    admin,
    db: globalForAdmin.__biztrixAdminDb,
  };
}
