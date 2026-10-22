import { DeliveryOrder, PilotKpis, ChartData, UserProfile, PilotTelemetryPayload } from '../types';
import { getServerUrl, getAuthToken } from '../config';
import { Platform } from 'react-native';

export class UnauthorizedError extends Error {
  constructor(message = 'Session expired. Please log in again.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network connection unavailable.') {
    super(message);
    this.name = 'NetworkError';
  }
}

async function handleApiResponse(res: Response): Promise<any> {
  if (res.status === 401 || res.status === 403) {
    throw new UnauthorizedError('Session authorization expired. Please log in again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }
  return data;
}

async function getHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function checkServerHealth(customUrl?: string): Promise<{ ok: boolean; message: string }> {
  try {
    const baseUrl = customUrl || (await getServerUrl());
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return { ok: true, message: 'Server Online & Connected' };
    }
    return { ok: false, message: `Server HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Connection Refused' };
  }
}

// 1. Pilot Login
export async function loginPilot(emailOrPhone: string, password: string): Promise<{
  success: boolean;
  token?: string;
  user?: UserProfile;
  must_change_password?: boolean;
  error?: string;
}> {
  const baseUrl = await getServerUrl();
  const isEmail = emailOrPhone.includes('@');
  const payload = isEmail ? { email: emailOrPhone, password } : { phone: emailOrPhone, password };

  const res = await fetch(`${baseUrl}/api/delivery/pilot/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Authentication failed. Check credentials.');
  }
  return data;
}

// 2. Change Password
export async function changePassword(
  userId: string,
  newPassword: string,
  oldPassword?: string
): Promise<{ success: boolean; message: string }> {
  const baseUrl = await getServerUrl();
  const res = await fetch(`${baseUrl}/api/delivery/pilot/change-password`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ userId, newPassword, oldPassword }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update password');
  }
  return data;
}

// 3. Fetch Dashboard (KPIs, Charts, Orders)
export async function fetchPilotDashboard(pilotId?: string): Promise<{
  kpis: PilotKpis;
  chart_data: ChartData;
  active_orders: DeliveryOrder[];
  history_orders?: DeliveryOrder[];
}> {
  const baseUrl = await getServerUrl();
  const query = pilotId ? `?pilotId=${encodeURIComponent(pilotId)}` : '';
  const res = await fetch(`${baseUrl}/api/delivery/pilot/dashboard${query}`, {
    method: 'GET',
    headers: await getHeaders(),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to load dashboard data');
  }
  return data;
}

// 3.1 Fetch Order History (Completed, Delivered, Cancelled)
export async function fetchPilotOrderHistory(pilotId?: string): Promise<{
  success: boolean;
  orders: DeliveryOrder[];
}> {
  const baseUrl = await getServerUrl();
  const query = pilotId ? `?pilotId=${encodeURIComponent(pilotId)}` : '';
  const res = await fetch(`${baseUrl}/api/delivery/pilot/history${query}`, {
    method: 'GET',
    headers: await getHeaders(),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to load order history');
  }
  return data;
}

// Helper: Call Render First; if it fails or times out, immediately fall back to Local
export async function geocodeDeliveryAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!address || typeof address !== 'string') return null;
  try {
    const data = await fetchWithRenderAndLocalFallback(`/api/delivery/geocode?address=${encodeURIComponent(address)}`, { method: 'GET' });
    if (data && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
      return { latitude: data.lat, longitude: data.lng };
    }
  } catch (e) {}

  try {
    const cleaned = address.replace(/(?:\+91[\-\s]?)?[6-9]\d{9}\b/g, '').replace(/^[^,]+,\s*/, '').trim();
    const nRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleaned || address)}&limit=1`, {
      headers: { 'User-Agent': 'IndoFleet-PilotApp/1.0', 'Accept': 'application/json' }
    });
    if (nRes.ok) {
      const nData = await nRes.json();
      if (Array.isArray(nData) && nData[0]?.lat && nData[0]?.lon) {
        return { latitude: parseFloat(nData[0].lat), longitude: parseFloat(nData[0].lon) };
      }
    }
  } catch (e) {}
  return null;
}

async function fetchWithRenderAndLocalFallback(
  path: string,
  options: RequestInit
): Promise<any> {
  const RENDER_BASE = 'https://indo-fleet.onrender.com';

  const localCandidates: string[] = [];
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname || 'localhost';
    localCandidates.push(`http://${host}:5000`);
    localCandidates.push('http://localhost:5000');
    localCandidates.push('http://127.0.0.1:5000');
  } else {
    localCandidates.push('http://10.0.2.2:5000');
    localCandidates.push('http://localhost:5000');
    localCandidates.push('http://192.168.1.100:5000');
  }

  // 1. FIRST: Attempt Render
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${RENDER_BASE}${path}`, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => null);
    if (res.ok && data?.success !== false) {
      return data;
    }
  } catch (err: any) {
    // Render failed or timed out, proceed silently to Local
  }

  // 2. SECOND: Attempt Local Fallback
  for (const localBase of Array.from(new Set(localCandidates))) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${localBase}${path}`, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success !== false) {
        return data;
      }
    } catch {
      // try next candidate
    }
  }

  throw new Error('Request failed on Render and Local fallback. Please check connection.');
}
// 3.5. Request Delivery Partner Self Acceptance OTP (Render First -> Local Fallback)
export async function requestPilotAcceptanceOtp(
  orderId: string,
  extra?: { pilotId?: string; pilotEmail?: string; pilotPhone?: string }
): Promise<{ success: boolean; acceptance_otp?: string; message: string }> {
  return await fetchWithRenderAndLocalFallback('/api/delivery/pilot/request-acceptance-otp', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({
      order_id: orderId,
      pilot_id: extra?.pilotId,
      pilot_email: extra?.pilotEmail,
      pilot_phone: extra?.pilotPhone,
    }),
  });
}

// 4. Accept Assigned Order via OTP (Render First -> Local Fallback)
export async function acceptAssignedOrder(
  orderId: string,
  otp: string,
  pilotName: string,
  extra?: { pilotId?: string; pilotEmail?: string; pilotPhone?: string; dlId?: string; vehicleId?: string }
): Promise<any> {
  return await fetchWithRenderAndLocalFallback('/api/delivery/pilot/accept-order', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({
      order_id: orderId,
      otp,
      pilot_name: pilotName,
      pilot_id: extra?.pilotId,
      pilot_email: extra?.pilotEmail,
      pilot_phone: extra?.pilotPhone,
      dl_id: extra?.dlId,
      vehicle_id: extra?.vehicleId
    }),
  });
}

// 5. Request Delivery Partner Departure / Pickup OTP
export async function requestDispatcherHandoverOtp(
  orderId: string,
  pilotName: string,
  extra?: { pilotId?: string; pilotEmail?: string; pilotPhone?: string }
): Promise<{ success: boolean; handover_otp?: string; message?: string }> {
  const baseUrl = await getServerUrl();
  const res = await fetch(`${baseUrl}/api/delivery/pilot/request-handover-otp`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({
      order_id: orderId,
      pilot_name: pilotName,
      pilot_id: extra?.pilotId,
      pilot_email: extra?.pilotEmail,
      pilot_phone: extra?.pilotPhone,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to request departure OTP');
  }
  return data;
}

// 6. Verify Dispatcher Handover & Start Flight (Triggers Customer Email & Live Tracking)
export async function verifyHandoverAndStartFlight(payload: {
  order_id: string;
  dispatcher_otp?: string;
  pilot_otp?: string;
  pilot_name: string;
  pilot_phone?: string;
  vehicle_id?: string;
  initial_lat?: number;
  initial_lng?: number;
}): Promise<any> {
  const baseUrl = await getServerUrl();
  const res = await fetch(`${baseUrl}/api/delivery/pilot/verify-handover-and-start-flight`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to start flight transit');
  }
  return data;
}

// 7. Update Live GPS Telemetry
export async function updatePilotLocation(payload: PilotTelemetryPayload): Promise<any> {
  const baseUrl = await getServerUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`${baseUrl}/api/delivery/pilot/update-location`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  } catch (err) {
    console.warn('updatePilotLocation error:', err);
    throw err;
  }
}

// 8. SOS Emergency Beacon Alert
export async function triggerSosEmergency(payload: {
  pilot_name: string;
  pilot_phone?: string;
  vehicle_id?: string;
  latitude: number;
  longitude: number;
  battery_pct?: number;
  audio_base64?: string;
  notes?: string;
}): Promise<any> {
  const baseUrl = await getServerUrl();
  const res = await fetch(`${baseUrl}/api/delivery/pilot/sos-emergency`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to transmit SOS beacon');
  }
  return data;
}

// 9. Request Customer Delivery OTP
export async function requestCustomerDeliveryOtp(orderId: string): Promise<{ success: boolean; customer_otp?: string; message: string }> {
  const baseUrl = await getServerUrl();
  const res = await fetch(`${baseUrl}/api/delivery/pilot/request-customer-otp`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ order_id: orderId }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to request customer verification OTP');
  }
  return data;
}

// 9b. Request Pilot Self Verification Delivery OTP
export async function requestPilotDeliveryOtp(
  orderId: string,
  pilotEmail?: string,
  pilotPhone?: string,
  pilotName?: string
): Promise<{ success: boolean; pilot_otp?: string; message: string }> {
  const baseUrl = await getServerUrl();
  const res = await fetch(`${baseUrl}/api/delivery/pilot/request-pilot-delivery-otp`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({
      order_id: orderId,
      pilot_email: pilotEmail,
      pilot_phone: pilotPhone,
      pilot_name: pilotName,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to request pilot verification OTP');
  }
  return data;
}

// 10. Complete Handover with Proof of Delivery (POD) - Both Customer OTP and Pilot Self OTP Verified
export async function completeDeliveryHandover(payload: {
  order_id: string;
  customer_otp: string;
  pilot_otp: string;
  recipient_name: string;
  digital_signature?: string;
  pod_photo?: string;
  final_latitude?: number;
  final_longitude?: number;
  delivery_notes?: string;
  pilot_name?: string;
  inspection_id?: string;
}): Promise<any> {
  const baseUrl = await getServerUrl();
  const res = await fetch(`${baseUrl}/api/delivery/pilot/complete-delivery`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to complete delivery handover');
  }
  return data;
}

// 11. Profile & Support
export async function fetchPilotProfile(pilotId: string): Promise<UserProfile> {
  const baseUrl = await getServerUrl();
  const res = await fetch(`${baseUrl}/api/delivery/pilot/profile?pilotId=${encodeURIComponent(pilotId)}`, {
    method: 'GET',
    headers: await getHeaders(),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch profile');
  }
  return data.profile;
}

export async function updatePilotProfile(payload: {
  userId: string;
  name?: string;
  phone?: string;
  dl_id?: string;
  employee_id?: string;
  vehicle_id?: string;
}): Promise<UserProfile> {
  const baseUrl = await getServerUrl();
  const res = await fetch(`${baseUrl}/api/delivery/pilot/profile`, {
    method: 'PATCH',
    headers: await getHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update profile');
  }
  return data.profile;
}

export async function submitSupportTicket(payload: {
  pilot_id: string;
  pilot_name: string;
  order_id?: string;
  issue_category: string;
  message: string;
  priority?: string;
}): Promise<any> {
  const baseUrl = await getServerUrl();
  const res = await fetch(`${baseUrl}/api/delivery/pilot/support-ticket`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to submit support ticket');
  }
  return data;
}

export async function submitPostDeliveryInspection(payload: {
  drone_id: string;
  delivery_id?: string;
  stage?: string;
  inspection_type?: string;
  cargo_bay_condition?: string;
  landing_surface?: string;
  propeller_debris_check?: string;
  field_battery_level?: number | null;
  zero_defect_certified?: boolean;
  delivery_handover_notes?: string;
  body_condition?: string;
  propeller_condition?: string;
  battery_condition?: string;
  landing_gear_condition?: string;
  overall_inspection: string;
  remarks?: string;
  photo_references?: string[];
  video_references?: string[];
  media_evidence?: { type: 'image' | 'video'; uri: string; name?: string }[];
}): Promise<any> {
  const baseUrl = await getServerUrl();
  const res = await fetch(`${baseUrl}/api/delivery/inspections`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to submit inspection');
  }
  return data.inspection;
}

// 12. Verify Drone QR belongs to Order
export async function verifyDroneForOrder(orderId: string, droneId: string): Promise<{
  success: boolean;
  matched: boolean;
  drone_id: string;
  model_name?: string;
  order_id: string;
  order_number?: string;
  already_inspected?: boolean;
}> {
  try {
    const baseUrl = await getServerUrl();
    const res = await fetch(`${baseUrl}/api/delivery/pilot/verify-drone-order`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ order_id: orderId, drone_id: droneId }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // Non-JSON response (e.g. server HTML error / cold start)
      return {
        success: false,
        matched: false,
        drone_id: droneId,
        order_id: orderId,
      };
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        matched: false,
        drone_id: droneId,
        order_id: orderId,
      };
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      matched: false,
      drone_id: droneId,
      order_id: orderId,
    };
  }
}
