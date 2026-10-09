import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  Auth
} from 'firebase/auth';

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || ''
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('BlaKIq')
);

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

function getFirebaseAuth(): Auth | null {
  if (authInstance) return authInstance;
  try {
    if (!firebaseConfig.apiKey) return null;
    appInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(appInstance);
    return authInstance;
  } catch (err) {
    console.warn('[Firebase] Auth initialization skipped or API Key invalid:', err);
    return null;
  }
}

// Global confirmation result store for phone OTP
let confirmationResultHolder: ConfirmationResult | null = null;
let recaptchaVerifierHolder: RecaptchaVerifier | null = null;

export function setupRecaptcha(containerId: string): RecaptchaVerifier | null {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    document.body.appendChild(container);
  }

  if (recaptchaVerifierHolder) {
    try {
      recaptchaVerifierHolder.clear();
    } catch {}
  }

  try {
    recaptchaVerifierHolder = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {}
    });
    return recaptchaVerifierHolder;
  } catch (err) {
    console.warn('[Firebase Recaptcha Error]:', err);
    return null;
  }
}

export async function sendFirebasePhoneOtp(
  phoneNumber: string,
  containerId: string = 'recaptcha-container'
): Promise<{ success: boolean; message?: string }> {
  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      return {
        success: false,
        message: 'Firebase Web API Key is invalid or Phone Auth is not enabled in Firebase Console.'
      };
    }

    const formattedPhone = phoneNumber.startsWith('+')
      ? phoneNumber
      : `+91${phoneNumber.replace(/[^0-9]/g, '').slice(-10)}`;

    const verifier = setupRecaptcha(containerId);
    if (!verifier) {
      return {
        success: false,
        message: 'Could not initialize reCAPTCHA verifier. Check Firebase API key.'
      };
    }

    confirmationResultHolder = await signInWithPhoneNumber(auth, formattedPhone, verifier);
    return { success: true };
  } catch (error: any) {
    console.warn('[Firebase Phone Auth] Error sending OTP:', error?.message || error);
    return {
      success: false,
      message: error?.message || 'Failed to dispatch SMS OTP via Firebase.'
    };
  }
}

export async function verifyFirebasePhoneOtp(
  otpCode: string
): Promise<{ success: boolean; idToken?: string; phone?: string; error?: string }> {
  try {
    if (!confirmationResultHolder) {
      return {
        success: false,
        error: 'No active OTP request found. Please request a new verification code.'
      };
    }
    const result = await confirmationResultHolder.confirm(otpCode.trim());
    const idToken = await result.user.getIdToken();
    return {
      success: true,
      idToken,
      phone: result.user.phoneNumber || undefined
    };
  } catch (error: any) {
    console.error('[Firebase Phone Auth] Error verifying OTP:', error);
    return {
      success: false,
      error: error?.message || 'Invalid or expired OTP code.'
    };
  }
}
