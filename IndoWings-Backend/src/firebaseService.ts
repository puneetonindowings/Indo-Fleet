import './env.js';
import fs from 'fs';
import path from 'path';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getAuth, Auth } from 'firebase-admin/auth';

let firebaseApp: App | null = null;
let messagingClient: Messaging | null = null;
let authClient: Auth | null = null;

/**
 * Initializes Firebase Admin SDK using environment variables or service account JSON.
 */
export function initializeFirebase(): App | null {
  if (firebaseApp) return firebaseApp;
  if (getApps().length > 0) {
    firebaseApp = getApps()[0];
    messagingClient = getMessaging(firebaseApp);
    authClient = getAuth(firebaseApp);
    return firebaseApp;
  }

  try {
    // 1. Check for raw JSON string in env
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson && serviceAccountJson.trim()) {
      const parsed = JSON.parse(serviceAccountJson);
      firebaseApp = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id
      });
      messagingClient = getMessaging(firebaseApp);
      authClient = getAuth(firebaseApp);
      console.log(`[Firebase] Initialized with Service Account JSON (${parsed.project_id})`);
      return firebaseApp;
    }

    // 2. Check for service account file path
    const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.FIREBASE_PRIVATE_KEY_PATH;
    const candidates = [
      configuredPath,
      path.resolve(process.cwd(), 'firebase_admin_key.json'),
      path.resolve(process.cwd(), 'IndoWings-Backend', 'firebase_admin_key.json'),
      './firebase_admin_key.json'
    ].filter(Boolean) as string[];

    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, 'utf8');
          const parsed = JSON.parse(raw);
          if (parsed.private_key && !parsed.private_key.includes('...')) {
            firebaseApp = initializeApp({
              credential: cert(parsed),
              projectId: parsed.project_id
            });
            messagingClient = getMessaging(firebaseApp);
            authClient = getAuth(firebaseApp);
            console.log(`[Firebase] Initialized with service key file: ${filePath} (${parsed.project_id})`);
            return firebaseApp;
          }
        } catch {
          // Continue to next candidate
        }
      }
    }

    // 3. Check individual env variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey && !privateKey.includes('...')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
      firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey
        }),
        projectId
      });
      messagingClient = getMessaging(firebaseApp);
      authClient = getAuth(firebaseApp);
      console.log(`[Firebase] Initialized with env credentials for project: ${projectId}`);
      return firebaseApp;
    }

    console.log('[Firebase] Standing by: Service account key not yet provided. (Will activate automatically once keys are added to .env or firebase_admin_key.json).');
    return null;
  } catch (error) {
    console.error('[Firebase] Failed to initialize Firebase Admin SDK:', error instanceof Error ? error.message : error);
    return null;
  }
}

// Attempt initialization
initializeFirebase();

/**
 * In-memory registry for device FCM push tokens (Pilot App / Web App)
 */
const deviceTokensByUserId = new Map<string, Set<string>>();
const allPilotTokens = new Set<string>();

export function registerDeviceToken(userId: string, token: string, role?: string): void {
  if (!token) return;
  if (!deviceTokensByUserId.has(userId)) {
    deviceTokensByUserId.set(userId, new Set());
  }
  deviceTokensByUserId.get(userId)!.add(token);

  if (role === 'pilot' || role === 'fleet_pilot') {
    allPilotTokens.add(token);
  }
  console.log(`[Firebase] Registered FCM push token for user ${userId} (${role || 'user'})`);
}

export function unregisterDeviceToken(userId: string, token: string): void {
  if (deviceTokensByUserId.has(userId)) {
    deviceTokensByUserId.get(userId)!.delete(token);
  }
  allPilotTokens.delete(token);
}

/**
 * Send a push notification to a specific device FCM token
 */
export async function sendPushNotification({
  token,
  title,
  body,
  data = {}
}: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<boolean> {
  const app = initializeFirebase();
  if (!app || !messagingClient) {
    console.log(`[Firebase Push Skipped] (Waiting for keys): ${title} -> ${body}`);
    return false;
  }

  try {
    const response = await messagingClient.send({
      token,
      notification: {
        title,
        body
      },
      data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'indofleet_flight_alerts',
          priority: 'max'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    });

    console.log(`[Firebase Push Sent] Message ID: ${response}`);
    return true;
  } catch (err: any) {
    console.error('[Firebase Push Error]:', err?.message || err);
    return false;
  }
}

/**
 * Send push notifications to all devices of a user
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<number> {
  const tokens = deviceTokensByUserId.get(userId);
  if (!tokens || tokens.size === 0) return 0;

  let successCount = 0;
  for (const token of tokens) {
    const sent = await sendPushNotification({ token, title, body, data });
    if (sent) successCount++;
  }
  return successCount;
}

/**
 * Broadcast push notification to all online pilots
 */
export async function broadcastPushToPilots(
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<number> {
  if (allPilotTokens.size === 0) return 0;

  let successCount = 0;
  for (const token of allPilotTokens) {
    const sent = await sendPushNotification({ token, title, body, data });
    if (sent) successCount++;
  }
  return successCount;
}

/**
 * Verify a Firebase Phone Auth ID Token sent by client app
 */
export async function verifyFirebasePhoneToken(idToken: string): Promise<{
  valid: boolean;
  phoneNumber?: string;
  uid?: string;
  error?: string;
}> {
  const app = initializeFirebase();
  if (!app || !authClient) {
    return { valid: false, error: 'Firebase Admin is not configured.' };
  }

  try {
    const decodedToken = await authClient.verifyIdToken(idToken);
    return {
      valid: true,
      phoneNumber: decodedToken.phone_number,
      uid: decodedToken.uid
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error?.message || 'Invalid or expired Firebase ID token.'
    };
  }
}
