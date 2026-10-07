import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
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
  firebaseConfig.apiKey && firebaseConfig.projectId
);

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Global confirmation result store for phone OTP
let confirmationResultHolder: ConfirmationResult | null = null;
let recaptchaVerifierHolder: RecaptchaVerifier | null = null;

export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifierHolder) {
    try {
      recaptchaVerifierHolder.clear();
    } catch {}
  }
  recaptchaVerifierHolder = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved - will proceed with phone auth
    },
    'expired-callback': () => {
      // Response expired. Ask user to solve reCAPTCHA again.
    }
  });
  return recaptchaVerifierHolder;
}

export async function sendFirebasePhoneOtp(
  phoneNumber: string,
  containerId: string = 'recaptcha-container'
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase credentials are not configured in .env.local.');
    }
    
    // Ensure international format (e.g. +91XXXXXXXXXX)
    const formattedPhone = phoneNumber.startsWith('+')
      ? phoneNumber
      : `+91${phoneNumber.replace(/[^0-9]/g, '').slice(-10)}`;

    const verifier = setupRecaptcha(containerId);
    confirmationResultHolder = await signInWithPhoneNumber(auth, formattedPhone, verifier);
    return { success: true };
  } catch (error: any) {
    console.error('[Firebase Phone Auth] Error sending OTP:', error);
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
