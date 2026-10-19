const env = (import.meta as any).env || {};
const rawEnvUrl = env.VITE_API_BASE_URL;

function resolveApiBaseUrl(): string {
  if (rawEnvUrl && rawEnvUrl.trim()) {
    return rawEnvUrl.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Same-origin API call — works for any domain without re-build
    return window.location.origin;
  }

  return 'http://localhost:5000';
}

export const API_BASE_URL = resolveApiBaseUrl();

export const PUBLIC_PORTAL_URL: string = (
  env.VITE_PUBLIC_PORTAL_URL ||
  (typeof window !== 'undefined' && window.location ? window.location.origin : 'https://indo-fleet.vercel.app')
).replace(/\/+$/, '');

export const SUPPORT_EMAIL: string = env.VITE_SUPPORT_EMAIL || 'connect@indowings.com';
export const SUPPORT_PHONE: string = env.VITE_SUPPORT_PHONE || '1800 572 7363';
export const DEMO_ADMIN_EMAIL: string = env.VITE_DEMO_ADMIN_EMAIL || 'puneet.kushwaha@indowfleet.com';
export const DEMO_ADMIN_NAME: string = env.VITE_DEMO_ADMIN_NAME || 'Puneet Kushwaha';
