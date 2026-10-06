const rawEnvUrl = (import.meta as any).env?.VITE_API_BASE_URL;

function resolveApiBaseUrl(): string {
  if (rawEnvUrl) {
    if (rawEnvUrl.includes('indowings-backend.onrender.com') && !rawEnvUrl.includes('vzrg')) {
      return 'https://indowings-backend-vzrg.onrender.com';
    }
    return rawEnvUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://indowings-backend-vzrg.onrender.com';
  }

  return 'http://localhost:5000';
}

export const API_BASE_URL = resolveApiBaseUrl();
