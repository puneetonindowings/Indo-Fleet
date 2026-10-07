const rawEnvUrl = (import.meta as any).env?.VITE_API_BASE_URL;

function resolveApiBaseUrl(): string {
  if (rawEnvUrl) {
    return rawEnvUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://indo-fleet.onrender.com';
  }

  return 'http://localhost:5000';
}

export const API_BASE_URL = resolveApiBaseUrl();
