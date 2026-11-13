import * as admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let cachedDb: Firestore | null = null;

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

  if (!cachedDb) {
    cachedDb = getFirestore(admin.app());
    cachedDb.settings({ ignoreUndefinedProperties: true });
  }

  return {
    admin,
    db: cachedDb,
  };
}
