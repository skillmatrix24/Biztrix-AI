
import * as admin from 'firebase-admin';

/**
 * Initializes the Firebase Admin SDK for server-side privileged operations.
 * This instance bypasses security rules and is used for secure background 
 * transactions like payment settlement and inventory deduction.
 */
export function initializeAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      // Application Default Credentials will be used when running on GCP/Firebase
      // In local dev, it picks up GOOGLE_APPLICATION_CREDENTIALS
      credential: admin.credential.applicationDefault(),
    });
    try {
      admin.firestore().settings({ ignoreUndefinedProperties: true });
    } catch {
      // Ignore if already configured
    }
  }

  const firestore = admin.firestore();

  return {
    admin,
    db: firestore,
  };
}
