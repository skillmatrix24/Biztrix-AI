'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance);
}

/** Initiate email/password sign-up. */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string) {
  return createUserWithEmailAndPassword(authInstance, email, password);
}

/** Initiate email/password sign-in. */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string) {
  return signInWithEmailAndPassword(authInstance, email, password);
}

/** Initiate Google sign-in with account selector. */
export function initiateGoogleSignIn(authInstance: Auth) {
  const provider = new GoogleAuthProvider();
  // Force Google to show the account picker every time
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(authInstance, provider);
}

/** Initiate password reset. */
export function initiatePasswordReset(authInstance: Auth, email: string) {
  return sendPasswordResetEmail(authInstance, email);
}

/** Setup Recaptcha for Phone Auth - Hardened for Singleton Stability */
export function setupRecaptcha(authInstance: Auth, elementId: string) {
  // 1. Check if container exists in DOM
  const container = document.getElementById(elementId);
  if (!container) {
    console.warn(`reCAPTCHA container #${elementId} not found.`);
    return null;
  }

  // 2. Clear any existing global verifier to prevent "element removed" errors
  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch (e) {
    console.error(e);
      // Ignore cleanup errors
    }
    (window as any).recaptchaVerifier = null;
  }

  // 3. Initialize fresh verifier node
  try {
    (window as any).recaptchaVerifier = new RecaptchaVerifier(authInstance, elementId, {
      'size': 'invisible',
      'callback': (response: any) => {
        // reCAPTCHA solved
      }
    });
    return (window as any).recaptchaVerifier;
  } catch (error) {
    console.error("reCAPTCHA Initialization Failed:", error);
    return null;
  }
}

/** Initiate Phone OTP Request */
export async function initiatePhoneSignIn(authInstance: Auth, phoneNumber: string, appVerifier: any): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(authInstance, phoneNumber, appVerifier);
}

/** Initiate sign-out (returns Promise). */
export function initiateSignOut(authInstance: Auth): Promise<void> {
  return signOut(authInstance);
}
